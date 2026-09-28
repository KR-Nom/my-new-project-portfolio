'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 세션 단위 검증 분리, CNN 조향·스로틀 회귀 학습, 실행 기록 저장
설명: 물리 차량에 연결하지 않는 오프라인 지도학습. 3장 데모만으로 학습하지 않는다.
실행: python train.py --validation-session SESSION_ID --epochs 20
'''
import argparse
import json
import os
from pathlib import Path

from dataset import connect, session_split

ROOT = Path(__file__).resolve().parent


def load_training_frames(data_dir, validation_ids):
    if not (Path(data_dir) / "sessions.sqlite3").is_file():
        raise ValueError("저장된 세션 DB가 없습니다. 먼저 웹앱을 실행하고 데이터를 올려주세요.")
    with connect(data_dir) as db:
        frames = [dict(row) for row in db.execute("SELECT * FROM frames ORDER BY session_id,timestamp_ms")]
    train, validation = session_split(frames, validation_ids)
    if len(train) < 20 or len(validation) < 5:
        raise ValueError("학습 20장, 검증 5장 이상이 필요합니다. 공개 샘플 3장은 조회용입니다.")
    return train, validation


def main():
    parser = argparse.ArgumentParser(description="RC 이미지 → 조향·스로틀 CNN 회귀")
    parser.add_argument("--data-dir", type=Path, default=Path(os.getenv("RC_DATA_DIR", ROOT / "data")))
    parser.add_argument("--validation-session", action="append", required=True,
                        help="검증용 세션 ID. 같은 주행의 인접 프레임이 학습/검증에 섞이지 않게 분리")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--output", type=Path, default=ROOT / "runs" / "cnn")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--augment-flip", action="store_true", help="좌우 대칭이 타당한 트랙에만 사용. 조향 부호도 반전")
    args = parser.parse_args()
    if args.epochs < 1 or args.batch_size < 1:
        parser.error("epochs와 batch-size는 1 이상이어야 합니다.")
    if args.output.exists():
        parser.error("기존 학습 결과를 덮어쓰지 않습니다. 새로운 --output 경로를 선택해주세요.")
    try:
        train_frames, validation_frames = load_training_frames(args.data_dir, args.validation_session)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    try:
        import numpy as np
        import tensorflow as tf
    except ImportError:
        parser.error("TensorFlow가 없습니다. Python 3.11 환경에서 requirements-training.txt를 설치해주세요.")

    tf.keras.utils.set_random_seed(args.seed)
    tf.config.experimental.enable_op_determinism()

    def image_dataset(frames, training):
        paths = [str(args.data_dir / "images" / frame["stored_name"]) for frame in frames]
        labels = [[frame["steering"], frame["throttle"]] for frame in frames]
        dataset = tf.data.Dataset.from_tensor_slices((paths, labels))

        def decode(path, target):
            image = tf.io.decode_image(tf.io.read_file(path), channels=3, expand_animations=False)
            image.set_shape([None, None, 3])
            image = tf.image.resize(image, (120, 160))
            return image, tf.cast(target, tf.float32)

        dataset = dataset.map(decode)
        if training and args.augment_flip:
            mirrored = dataset.map(lambda image, target: (
                tf.image.flip_left_right(image), target * tf.constant([-1.0, 1.0])))
            dataset = dataset.concatenate(mirrored)
        if training:
            dataset = dataset.shuffle(len(frames) * (2 if args.augment_flip else 1), seed=args.seed)
        return dataset.batch(args.batch_size).prefetch(tf.data.AUTOTUNE)

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(120, 160, 3)),
        tf.keras.layers.Rescaling(1.0 / 255),          # 저장 모델 안에 동일 전처리를 포함
        tf.keras.layers.Cropping2D(cropping=((30, 0), (0, 0))),
        tf.keras.layers.Conv2D(16, 5, strides=2, activation="relu"),
        tf.keras.layers.Conv2D(32, 3, strides=2, activation="relu"),
        tf.keras.layers.Conv2D(48, 3, strides=2, activation="relu"),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(2, activation="tanh"),
    ], name="rc_command_cnn")
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="mse", metrics=["mae"])
    training_dataset = image_dataset(train_frames, True)
    validation_dataset = image_dataset(validation_frames, False)
    history = model.fit(training_dataset, validation_data=validation_dataset, epochs=args.epochs,
                        shuffle=False,              # tf.data 쪽에서 seed를 고정해 이미 섞음
                        callbacks=[tf.keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True)])
    predictions = model.predict(validation_dataset)
    targets = np.asarray([[frame["steering"], frame["throttle"]] for frame in validation_frames])
    error = np.abs(predictions - targets).mean(axis=0)
    baseline_mean = np.asarray([[frame["steering"], frame["throttle"]] for frame in train_frames]).mean(axis=0)
    baseline_error = np.abs(targets - baseline_mean).mean(axis=0)
    args.output.mkdir(parents=True)
    model.save(args.output / "model.keras")
    report = {
        "seed": args.seed, "tensorflow": tf.__version__,
        "train_sessions": sorted({frame["session_id"] for frame in train_frames}),
        "validation_sessions": args.validation_session,
        "train_frames": len(train_frames), "validation_frames": len(validation_frames),
        "train_hashes": sorted({frame["sha256"] for frame in train_frames}),
        "validation_hashes": sorted({frame["sha256"] for frame in validation_frames}),
        "input_size": [120, 160, 3], "augment_flip": args.augment_flip,
        "label_order": ["steering", "throttle"], "command_range": [-1, 1],
        "history": history.history,
        "validation_mae": {"steering": float(error[0]), "throttle": float(error[1])},
        "mean_command_baseline_mae": {"steering": float(baseline_error[0]), "throttle": float(baseline_error[1])},
        "limitation": "Offline held-out session error; no physical driving evaluation or safety assurance.",
    }
    (args.output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(args.output), "validation_mae": report["validation_mae"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
