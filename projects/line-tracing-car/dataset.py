'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 이미지-명령값 CSV 검증, ZIP 입력, SQLite 저장, 세션 분리 추가
설명: 실제 차량 제어 없이 수집된 주행 데이터를 검토하는 데이터 계층.
실행: python -m unittest discover -s tests
'''
import csv
import hashlib
import io
import math
import sqlite3
import uuid
import zipfile
from contextlib import contextmanager
from pathlib import Path, PurePosixPath

from PIL import Image, UnidentifiedImageError

FIELDS = ("filename", "timestamp_ms", "steering", "throttle")
MAX_ARCHIVE = 24 * 1024 * 1024
MAX_IMAGE = 4 * 1024 * 1024
MAX_UNCOMPRESSED = 80 * 1024 * 1024
MAX_ROWS = 3000


def safe_filename(name):
    path = PurePosixPath(name)
    if not name or path.is_absolute() or "\\" in name or ":" in name or "\x00" in name:
        raise ValueError("이미지 경로는 ZIP 안의 상대 경로여야 합니다.")
    if any(part in ("..", ".", "") for part in name.split("/")):
        raise ValueError("상위 폴더 이동이나 빈 경로는 사용할 수 없습니다.")
    if path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
        raise ValueError("JPG 또는 PNG 이미지만 사용할 수 있습니다.")
    return name


def validate_csv(raw_csv, read_image):
    try:
        csv_text = raw_csv.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("CSV는 UTF-8로 저장해주세요.") from error
    reader = csv.DictReader(io.StringIO(csv_text))
    if reader.fieldnames != list(FIELDS):
        raise ValueError("CSV 헤더: " + ",".join(FIELDS))
    frames, names, timestamps = [], set(), set()
    for line, row in enumerate(reader, start=2):
        if len(frames) >= MAX_ROWS:
            raise ValueError(f"한 세션은 {MAX_ROWS}개 이하의 프레임을 지원합니다.")
        try:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("열 개수가 올바르지 않습니다.")
            name = safe_filename(row["filename"].strip())
            timestamp = int(row["timestamp_ms"])
            steering, throttle = float(row["steering"]), float(row["throttle"])
            if timestamp < 0 or timestamp > 2**53 - 1:
                raise ValueError("timestamp_ms는 0 이상의 정수여야 합니다.")
            if not all(math.isfinite(value) and -1 <= value <= 1 for value in (steering, throttle)):
                raise ValueError("조향·스로틀은 -1~1 사이의 유한한 명령값이어야 합니다.")
            if name in names or timestamp in timestamps:
                raise ValueError("동일한 파일명이나 시각이 중복되었습니다.")
            image_bytes = read_image(name)
            if not image_bytes or len(image_bytes) > MAX_IMAGE:
                raise ValueError("이미지는 0바이트 초과, 4MB 이하여야 합니다.")
            with Image.open(io.BytesIO(image_bytes)) as photo:
                width, height = photo.size
                if photo.format not in ("JPEG", "PNG") or width * height > 12_000_000:
                    raise ValueError("12MP 이하의 JPEG/PNG 파일만 지원합니다.")
                photo.verify()                       # 확장자만 바꾼 파일과 손상 파일을 거부
            frames.append({"filename": name, "timestamp_ms": timestamp,
                           "steering": steering, "throttle": throttle,
                           "width": width, "height": height, "content": image_bytes,
                           "sha256": hashlib.sha256(image_bytes).hexdigest()})
            names.add(name)
            timestamps.add(timestamp)
        except (ValueError, KeyError, OSError, UnidentifiedImageError, Image.DecompressionBombError) as error:
            raise ValueError(f"CSV {line}행: {error}") from error
    if not frames:
        raise ValueError("CSV에 이미지-명령값 데이터가 없습니다.")
    return sorted(frames, key=lambda frame: frame["timestamp_ms"])


def read_archive(content):
    if len(content) > MAX_ARCHIVE:
        raise ValueError("ZIP은 24MB 이하여야 합니다.")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            names = [entry.filename for entry in entries]
            if len(names) != len(set(names)):
                raise ValueError("ZIP 내부에 같은 이름의 파일이 중복되었습니다.")
            if len(entries) > 6000 or sum(entry.file_size for entry in entries) > MAX_UNCOMPRESSED:
                raise ValueError("압축 해제 크기 또는 파일 수가 너무 큽니다.")
            if "frames.csv" not in names or archive.getinfo("frames.csv").file_size > 1024 * 1024:
                raise ValueError("ZIP 최상위에 1MB 이하의 frames.csv가 필요합니다.")
            def read_image(name):
                if archive.getinfo(name).file_size > MAX_IMAGE:
                    raise ValueError("이미지 하나는 4MB 이하여야 합니다.")
                return archive.read(name)             # 디스크에 extract하지 않아 경로 이탈 방지
            return validate_csv(archive.read("frames.csv"), read_image)
    except (zipfile.BadZipFile, RuntimeError, EOFError) as error:
        raise ValueError("올바른 비암호화 ZIP 파일을 올려주세요.") from error


@contextmanager
def connect(data_dir):
    connection = sqlite3.connect(Path(data_dir) / "sessions.sqlite3")
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(data_dir):
    data_dir = Path(data_dir)
    (data_dir / "images").mkdir(parents=True, exist_ok=True)
    with connect(data_dir) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, source TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
            );
            CREATE TABLE IF NOT EXISTS frames (
                id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
                filename TEXT NOT NULL, timestamp_ms INTEGER NOT NULL,
                steering REAL NOT NULL, throttle REAL NOT NULL,
                width INTEGER NOT NULL, height INTEGER NOT NULL,
                sha256 TEXT NOT NULL, stored_name TEXT NOT NULL,
                UNIQUE(session_id, filename), UNIQUE(session_id, timestamp_ms)
            );
            CREATE INDEX IF NOT EXISTS frame_session ON frames(session_id, timestamp_ms);
        """)


def save_session(data_dir, name, frames, source="사용자 업로드", session_id=None):
    name = name.strip()
    if not name or len(name) > 100:
        raise ValueError("세션 이름은 1~100자여야 합니다.")
    session_id = session_id or uuid.uuid4().hex
    written_files = []
    try:
        with connect(data_dir) as db:
            db.execute("INSERT INTO sessions(id,name,source) VALUES (?,?,?)", (session_id, name, source))
            for frame in frames:
                frame_id = uuid.uuid4().hex
                stored_name = frame_id + Path(frame["filename"]).suffix.lower()
                target = Path(data_dir) / "images" / stored_name
                target.write_bytes(frame["content"])
                written_files.append(target)
                db.execute("INSERT INTO frames VALUES (?,?,?,?,?,?,?,?,?,?)", (
                    frame_id, session_id, frame["filename"], frame["timestamp_ms"],
                    frame["steering"], frame["throttle"], frame["width"], frame["height"],
                    frame["sha256"], stored_name))
    except Exception:
        for target in written_files:
            target.unlink(missing_ok=True)
        raise
    return session_id


def seed_demo(data_dir, sample_dir):
    with connect(data_dir) as db:
        if db.execute("SELECT id FROM sessions WHERE id = 'public-demo'").fetchone():
            return
    sample_dir = Path(sample_dir)
    frames = validate_csv((sample_dir / "frames.csv").read_bytes(), lambda name: (sample_dir / name).read_bytes())
    save_session(data_dir, "Jordan Valley · 공개 샘플", frames,
                 "robocarstore / CC BY 4.0 · 2019-12-10 · 원본 중 3장 발췌", "public-demo")


def export_csv(frames):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=FIELDS, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(frames)
    return output.getvalue()


def session_split(frames, validation_session_ids):
    validation_ids = set(validation_session_ids)
    known_ids = {frame["session_id"] for frame in frames}
    if not validation_ids or not validation_ids < known_ids:
        raise ValueError("검증 세션과 별도의 학습 세션이 각각 필요합니다.")
    train = [frame for frame in frames if frame["session_id"] not in validation_ids]
    validation = [frame for frame in frames if frame["session_id"] in validation_ids]
    overlap = {frame["sha256"] for frame in train} & {frame["sha256"] for frame in validation}
    if overlap:
        raise ValueError("학습·검증 세션에 같은 이미지가 있습니다. 중복을 제거해주세요.")
    return train, validation
