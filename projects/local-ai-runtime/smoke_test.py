"""Run against the local server: python smoke_test.py. No remote API or credentials."""
import base64
import json
import math
import struct
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:8320"


def request(path, body=None):
    encoded = json.dumps(body).encode() if body is not None else None
    with urlopen(Request(BASE + path, data=encoded, headers={"Content-Type": "application/json"}), timeout=90) as response:
        return json.load(response)


health = request("/health")
assert health["status"] == "ok" and health["trust_remote_code"] is False
vectors = request("/v1/embeddings", {
    "model": "intfloat/multilingual-e5-small",
    "input": ["query: 날씨 캐시 시간", "passage: 날씨는 15분 동안 캐시됩니다."],
    "encoding_format": "base64",
})
decoded = [struct.unpack("<384f", base64.b64decode(item["embedding"])) for item in vectors["data"]]
assert len(decoded) == 2
assert all(abs(math.sqrt(sum(value * value for value in vector)) - 1) < 1e-5 for vector in decoded)
answer = request("/v1/chat/completions", {
    "model": "mlx-community/Qwen3-1.7B-4bit",
    "messages": [{"role": "user", "content": "Context: Weather forecasts are cached for 15 minutes. Question: How long are they cached? Answer in one sentence using only the context."}],
    "max_tokens": 64, "temperature": 0,
})
assert "15" in answer["choices"][0]["message"]["content"]
assert answer["usage"]["completion_tokens"] > 0
try:
    request("/v1/chat/completions", {"model": "invented-model", "messages": [{"role": "user", "content": "hello"}]})
except HTTPError as error:
    assert error.code == 400
else:
    raise AssertionError("Unknown model must be rejected")
print(json.dumps({"status": "pass", "embedding_dimensions": len(decoded[0]), "embedding_usage": vectors["usage"],
                  "answer": answer["choices"][0]["message"]["content"], "chat_usage": answer["usage"],
                  "chat_metrics": answer["local_metrics"]}, ensure_ascii=False))
