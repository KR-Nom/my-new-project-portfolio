'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 합성 입력으로 1 epoch 학습→모델 저장→추론 경로 실행
설명: 실제 주행 성능 테스트가 아니다. 생성 입력은 임시 폴더에만 둔다.
실행: python tests/smoke_training.py (TensorFlow 환경)
'''
import csv
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dataset import initialize, save_session, validate_csv


def main():
    rng = np.random.default_rng(42)
    with tempfile.TemporaryDirectory(prefix="rc-synthetic-smoke-") as temporary:
        directory = Path(temporary)
        initialize(directory)
        first_image = None
        for session_id, count in (("synthetic-train", 20), ("synthetic-validation", 5)):
            images = {}
            csv_file = io.StringIO()
            writer = csv.writer(csv_file)
            writer.writerow(["filename", "timestamp_ms", "steering", "throttle"])
            for index in range(count):
                pixels = rng.integers(0, 80, (120, 160, 3), dtype=np.uint8)
                offset = index % 15 - 7
                pixels[:, 40 + offset:43 + offset, :] = 240
                pixels[:, 115 + offset:118 + offset, :] = 240
                output = io.BytesIO()
                Image.fromarray(pixels).save(output, "JPEG")
                filename = f"frame-{index}.jpg"
                images[filename] = output.getvalue()
                writer.writerow([filename, index * 1000, offset / 10, 0.3])
                if first_image is None:
                    first_image = directory / "synthetic-input.jpg"
                    first_image.write_bytes(output.getvalue())
            frames = validate_csv(csv_file.getvalue().encode(), images.__getitem__)
            save_session(directory, session_id, frames, source="SYNTHETIC TEST FIXTURE", session_id=session_id)
        output_dir = directory / "model-output"
        subprocess.run([sys.executable, str(ROOT / "train.py"), "--data-dir", str(directory),
                        "--validation-session", "synthetic-validation", "--epochs", "1",
                        "--batch-size", "5", "--augment-flip", "--output", str(output_dir)], check=True)
        report = json.loads((output_dir / "report.json").read_text())
        assert report["train_frames"] == 20 and report["validation_frames"] == 5
        assert set(report["train_hashes"]).isdisjoint(report["validation_hashes"])
        result = subprocess.run([sys.executable, str(ROOT / "predict.py"), "--model",
                                 str(output_dir / "model.keras"), "--image", str(first_image)],
                                check=True, capture_output=True, text=True)
        prediction = json.loads(result.stdout.strip().splitlines()[-1])
        assert all(-1 <= prediction[key] <= 1 for key in ("steering", "throttle"))
        assert prediction["hardware_command_sent"] is False
        print(json.dumps({"result": "PASS", "tensorflow": report["tensorflow"],
                          "pipeline": "synthetic fixture → session split → CNN 1 epoch → .keras save → prediction",
                          "physical_driving_evaluated": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
