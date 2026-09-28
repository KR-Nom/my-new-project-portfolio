"""Download only data/weights from official public repositories with token=False."""
import argparse
import os
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--model-root", required=True, type=Path)
args = parser.parse_args()
root = args.model_root.resolve()
root.mkdir(parents=True, exist_ok=True)
os.environ["HF_HOME"] = str(root / "hf-cache")
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"

from huggingface_hub import snapshot_download

snapshot_download(
    "mlx-community/Qwen3-1.7B-4bit", local_dir=root / "qwen3-1.7b", token=False,
    allow_patterns=["*.json", "*.safetensors", "*.txt", "*.model", "*.jinja", "LICENSE", "README.md"],
)
snapshot_download(
    "intfloat/multilingual-e5-small", local_dir=root / "multilingual-e5-small", token=False,
    allow_patterns=["onnx/model.onnx", "onnx/tokenizer.json", "onnx/tokenizer_config.json",
                    "onnx/special_tokens_map.json", "onnx/sentencepiece.bpe.model", "onnx/config.json", "README.md", "LICENSE"],
)
print("Models downloaded. Set LOCAL_MODEL_ROOT to:", root)
