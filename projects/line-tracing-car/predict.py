'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 저장 CNN 모델로 이미지 1장의 정규화 조향·스로틀 추론
설명: 결과는 JSON으로만 출력하며 GPIO, PWM, ESP32에 전달하지 않는다.
실행: python predict.py --model runs/cnn/model.keras --image sample-data/images/1720_cam-image_array_.jpg
'''
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="오프라인 RC 명령값 추론")
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    args = parser.parse_args()
    if not args.model.is_file() or not args.image.is_file():
        parser.error("모델과 이미지의 실제 파일 경로를 지정해주세요.")
    try:
        import tensorflow as tf
    except ImportError:
        parser.error("requirements-training.txt를 먼저 설치해주세요.")
    model = tf.keras.models.load_model(args.model, compile=False)
    image = tf.io.decode_image(tf.io.read_file(str(args.image)), channels=3, expand_animations=False)
    image = tf.image.resize(image, (120, 160))
    prediction = model(tf.expand_dims(image, 0), training=False).numpy()[0]
    print(json.dumps({"steering": float(prediction[0]), "throttle": float(prediction[1]),
                      "unit": "normalized_command", "hardware_command_sent": False}))


if __name__ == "__main__":
    main()
