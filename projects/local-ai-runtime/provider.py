"""장현진 · 2026-09-28. 공개 모델을 로컬에서 실행하는 최소 OpenAI 호환 API.

가중치는 LOCAL_MODEL_ROOT로 지정한 저장소 밖 폴더에서만 읽습니다.
원격 API, 자격증명, 사용자 .env, trust_remote_code를 사용하지 않습니다.
"""
import base64
import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from mlx_lm import load, stream_generate
from mlx_lm.sample_utils import make_sampler
from pydantic import BaseModel, Field
from tokenizers import Tokenizer

CHAT_MODEL = os.environ.get("LOCAL_CHAT_MODEL_ID", "mlx-community/Qwen3-1.7B-4bit")
EMBED_MODEL = "intfloat/multilingual-e5-small"
MODEL_ROOT = Path(os.environ.get("LOCAL_MODEL_ROOT", str(Path(__file__).resolve().parents[3] / "portfolio-runtime" / "public-models")))
chat_lock = threading.Lock()
embedding_lock = threading.Lock()
models = {}


@asynccontextmanager
async def lifespan(app):
    chat_path = MODEL_ROOT / os.environ.get("LOCAL_CHAT_MODEL_DIR", "qwen3-1.7b")
    embed_path = MODEL_ROOT / "multilingual-e5-small" / "onnx"
    if not (chat_path / "config.json").exists() or not (embed_path / "model.onnx").exists():
        raise RuntimeError("Run download_models.py first; LOCAL_MODEL_ROOT must point to its output.")
    models["chat"], models["tokenizer"] = load(str(chat_path), tokenizer_config={"trust_remote_code": False})
    models["embed_tokenizer"] = Tokenizer.from_file(str(embed_path / "tokenizer.json"))
    models["embed_tokenizer"].enable_truncation(max_length=512)
    models["embed_tokenizer"].enable_padding(pad_id=1, pad_token="<pad>")
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    models["embedding"] = ort.InferenceSession(str(embed_path / "model.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
    yield
    models.clear()


app = FastAPI(title="Local AI Runtime", version="1.0.0", lifespan=lifespan)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(max_length=50000)


class ChatInput(BaseModel):
    model: str = CHAT_MODEL
    messages: list[Message] = Field(min_length=1, max_length=30)
    max_tokens: int = Field(default=384, ge=1, le=2048)
    max_completion_tokens: int | None = Field(default=None, ge=1, le=2048)
    temperature: float = Field(default=0.0, ge=0, le=2)
    stream: bool = False


class EmbeddingInput(BaseModel):
    model: str = EMBED_MODEL
    input: str | list[str]
    encoding_format: Literal["float", "base64"] = "float"


@app.get("/health")
def health():
    return {"status": "ok", "provider": "local", "chat_model": CHAT_MODEL, "embedding_model": EMBED_MODEL,
            "embedding_dimensions": 384, "trust_remote_code": False, "external_api_calls": False}


@app.get("/v1/models")
def list_models():
    return {"object": "list", "data": [{"id": name, "object": "model", "owned_by": "local"} for name in (CHAT_MODEL, EMBED_MODEL)]}


@app.post("/v1/chat/completions")
def chat_completion(payload: ChatInput):
    if payload.model not in {CHAT_MODEL, "local-qwen"}:
        raise HTTPException(400, "Supported model: " + CHAT_MODEL)
    if payload.stream:
        raise HTTPException(400, "This local adapter supports stream=false.")
    started = time.perf_counter()
    with chat_lock:
        tokenizer = models["tokenizer"]
        prompt = tokenizer.apply_chat_template([message.model_dump() for message in payload.messages],
                                              tokenize=False, add_generation_prompt=True, enable_thinking=False)
        if len(tokenizer.encode(prompt)) > 8192:
            raise HTTPException(400, "Local prototype limit: 8192 prompt tokens.")
        parts = []
        maximum = payload.max_completion_tokens or payload.max_tokens
        for response in stream_generate(models["chat"], tokenizer, prompt, max_tokens=maximum,
                                        sampler=make_sampler(temp=payload.temperature)):
            parts.append(response.text)
        content = "".join(parts)
        prompt_tokens = response.prompt_tokens
        completion_tokens = response.generation_tokens
    return {"id": "chatcmpl-local-" + uuid.uuid4().hex, "object": "chat.completion", "created": int(time.time()),
            "model": CHAT_MODEL,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content},
                         "finish_reason": response.finish_reason or "stop"}],
            "usage": {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
                      "total_tokens": prompt_tokens + completion_tokens},
            "local_metrics": {"elapsed_seconds": round(time.perf_counter() - started, 4), "runtime": "MLX", "quantization": "4-bit"}}


@app.post("/v1/embeddings")
def embeddings(payload: EmbeddingInput):
    if payload.model not in {EMBED_MODEL, "local-e5"}:
        raise HTTPException(400, "Supported model: " + EMBED_MODEL)
    texts = [payload.input] if isinstance(payload.input, str) else payload.input
    if not texts or len(texts) > 64 or any(not isinstance(text, str) or not text.strip() or len(text) > 30000 for text in texts):
        raise HTTPException(422, "Provide 1–64 nonempty strings, each at most 30000 characters.")
    # E5 requires query:/passage: prefixes in every language. Preserve caller prefixes.
    texts = [text if text.startswith(("query: ", "passage: ")) else "passage: " + text for text in texts]
    started = time.perf_counter()
    all_vectors = []
    token_count = 0
    with embedding_lock:
        for offset in range(0, len(texts), 8):
            batch = models["embed_tokenizer"].encode_batch(texts[offset:offset + 8])
            input_ids = np.asarray([entry.ids for entry in batch], dtype=np.int64)
            attention_mask = np.asarray([entry.attention_mask for entry in batch], dtype=np.int64)
            token_type_ids = np.asarray([entry.type_ids for entry in batch], dtype=np.int64)
            hidden = models["embedding"].run(None, {"input_ids": input_ids, "attention_mask": attention_mask, "token_type_ids": token_type_ids})[0]
            masked = hidden * attention_mask[:, :, None]
            vectors = masked.sum(axis=1) / attention_mask.sum(axis=1)[:, None]
            vectors = (vectors / np.linalg.norm(vectors, axis=1, keepdims=True)).astype(np.float32)
            token_count += int(attention_mask.sum())
            all_vectors.extend(vectors)
    result = [{"object": "embedding", "index": index,
               "embedding": vector.tolist() if payload.encoding_format == "float" else base64.b64encode(vector.tobytes()).decode("ascii")}
              for index, vector in enumerate(all_vectors)]
    return {"object": "list", "model": EMBED_MODEL, "data": result,
            "usage": {"prompt_tokens": token_count, "total_tokens": token_count},
            "local_metrics": {"elapsed_seconds": round(time.perf_counter() - started, 4),
                              "dimensions": 384, "max_input_tokens": 512, "runtime": "ONNX Runtime CPU"}}
