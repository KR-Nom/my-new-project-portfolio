"""ToonVoice: local image → Korean OCR → edited dialogue → WAV workspace."""

from contextlib import contextmanager
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import json
import os
import platform
import shutil
import sqlite3
import struct
import subprocess
import tempfile
import threading
import warnings
import wave
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware

ROOT = Path(__file__).resolve().parent
MAX_UPLOAD = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000
VOICE_OPTIONS = {"Yuna": "유나 · 한국어", "Eddy (한국어(한국))": "에디 · 한국어", "Flo (한국어(한국))": "플로 · 한국어"}


def now():
    return datetime.now(timezone.utc).isoformat()


class ProjectInput(BaseModel):
    title: str = Field(default="새 웹툰 프로젝트", min_length=1, max_length=80)

    @field_validator("title")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("제목을 입력해 주세요.")
        return value.strip()


class DialogueInput(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    speaker: str = Field(default="서윤", min_length=1, max_length=30)
    voice: str = "Yuna"
    rate: int = Field(default=170, ge=100, le=260)

    @field_validator("text", "speaker")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("빈 대사와 인물 이름은 저장할 수 없습니다.")
        return value.strip()

    @field_validator("voice")
    @classmethod
    def supported_voice(cls, value):
        if value not in VOICE_OPTIONS:
            raise ValueError("지원하지 않는 음성입니다.")
        return value


class DialogueSave(BaseModel):
    revision: int = Field(ge=0)
    lines: list[DialogueInput] = Field(max_length=40)


class RevisionInput(BaseModel):
    revision: int = Field(ge=0)


def merge_regions(regions):
    """Join adjacent OCR lines in the same bubble; keep image reading order."""
    grouped = []
    for region in regions[:80]:
        text = region["text"].strip()
        if not text:
            continue
        if grouped:
            previous = grouped[-1]
            gap = region["y"] - previous["y"] - previous["height"]
            overlap = min(previous["x"] + previous["width"], region["x"] + region["width"]) - max(previous["x"], region["x"])
            if -0.01 <= gap <= 0.035 and overlap > 0.3 * min(previous["width"], region["width"]):
                previous["text"] += "\n" + text
                right = max(previous["x"] + previous["width"], region["x"] + region["width"])
                previous["x"] = min(previous["x"], region["x"])
                previous["width"] = right - previous["x"]
                previous["height"] = max(previous["height"], region["y"] + region["height"] - previous["y"])
                previous["confidence"] = min(previous["confidence"], region["confidence"])
                continue
        grouped.append({**region, "text": text})
    return grouped[:40]


def describe_wav(path):
    with wave.open(str(path), "rb") as audio:
        frames, sample_rate = audio.getnframes(), audio.getframerate()
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or not frames:
            raise ValueError("Expected nonempty 16-bit mono WAV.")
        samples = struct.unpack(f"<{frames}h", audio.readframes(frames))
    stride = max(1, len(samples) // 72)
    peaks = [round(max(abs(v) for v in samples[i:i + stride]) / 32768, 4) for i in range(0, len(samples), stride)][:72]
    return round(frames / sample_rate, 3), peaks


def create_app(data_dir=None):
    data = Path(data_dir or os.environ.get("TOONVOICE_DATA_DIR", ROOT / "data")).resolve()
    data.mkdir(parents=True, exist_ok=True)
    uploads, audios, cache = (data / name for name in ("images", "audio", "engine"))
    for directory in (uploads, audios, cache):
        directory.mkdir(exist_ok=True)
    database = data / "toonvoice.sqlite3"
    locks, locks_guard, compile_lock = {}, threading.Lock(), threading.Lock()
    engines = threading.BoundedSemaphore(2)

    @contextmanager
    def db():
        connection = sqlite3.connect(database, timeout=15)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    with db() as connection:
        connection.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, title TEXT NOT NULL,
                image_file TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 0, export_file TEXT,
                export_duration REAL, ocr_count INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS dialogue (
                id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL,
                position INTEGER NOT NULL, text TEXT NOT NULL, speaker TEXT NOT NULL,
                voice TEXT NOT NULL, rate INTEGER NOT NULL, confidence REAL, bbox TEXT,
                audio_file TEXT, duration REAL, waveform TEXT,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
        """)

    application = FastAPI(title="ToonVoice local studio", version="1.0.0")
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "[::1]", "testserver"])

    @application.middleware("http")
    async def local_requests(request: Request, call_next):
        if request.client and request.client.host not in {"127.0.0.1", "::1", "testclient"}:
            return JSONResponse({"detail": "이 서버는 로컬 컴퓨터에서만 사용할 수 있습니다."}, status_code=403)
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin and origin.rstrip("/") != str(request.base_url).rstrip("/"):
                return JSONResponse({"detail": "다른 웹사이트의 요청은 허용하지 않습니다."}, status_code=403)
            try:
                content_length = int(request.headers.get("content-length", "0") or "0")
            except ValueError:
                return JSONResponse({"detail": "올바르지 않은 요청 크기입니다."}, status_code=400)
            if content_length > MAX_UPLOAD + 65536:
                return JSONResponse({"detail": "이미지는 12MB까지 업로드할 수 있습니다."}, status_code=413)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @contextmanager
    def editing(project_id):
        with locks_guard:
            lock = locks.setdefault(str(project_id), threading.Lock())
        if not lock.acquire(blocking=False):
            raise HTTPException(409, "이 프로젝트의 작업이 진행 중입니다. 완료 후 다시 시도해 주세요.")
        try:
            yield
        finally:
            lock.release()

    def project_row(connection, project_id):
        row = connection.execute("SELECT * FROM projects WHERE id=?", (str(project_id),)).fetchone()
        if not row:
            raise HTTPException(404, "프로젝트를 찾을 수 없습니다.")
        return row

    def payload(project_id):
        with db() as connection:
            project = dict(project_row(connection, project_id))
            lines = [dict(row) for row in connection.execute("SELECT * FROM dialogue WHERE project_id=? ORDER BY position", (str(project_id),))]
        project["image_url"] = f"/api/projects/{project_id}/image" if project.pop("image_file") else None
        project["export_url"] = f"/api/projects/{project_id}/export" if project.pop("export_file") else None
        for line in lines:
            line["audio_url"] = f"/api/projects/{project_id}/lines/{line['id']}/audio" if line.pop("audio_file") else None
            line["waveform"] = json.loads(line["waveform"] or "[]")
            line["bbox"] = json.loads(line["bbox"] or "null")
            line.pop("project_id")
        project["lines"] = lines
        return project

    def check_revision(row, revision):
        if row["revision"] != revision:
            raise HTTPException(409, "다른 작업에서 내용이 바뀌었습니다. 프로젝트를 다시 열어 주세요.")

    def mac_engine():
        if platform.system() != "Darwin" or not Path("/usr/bin/say").exists():
            raise HTTPException(503, "OCR과 음성 생성은 macOS와 Command Line Tools가 필요합니다.")

    def run_engine(args, *, input_text=None, timeout=60):
        try:
            return subprocess.run(args, input=input_text, text=True, capture_output=True, timeout=timeout, check=True).stdout
        except subprocess.TimeoutExpired as error:
            raise HTTPException(504, "처리 시간이 초과됐습니다. 더 짧은 대사나 작은 이미지로 시도해 주세요.") from error
        except (subprocess.CalledProcessError, FileNotFoundError) as error:
            raise HTTPException(503, "로컬 엔진 실행에 실패했습니다. Swift 도구와 한국어 시스템 음성 설치를 확인해 주세요.") from error

    def recognize(image_path):
        mac_engine()
        binary = cache / "vision-ocr"
        source = ROOT / "scripts" / "ocr.swift"
        with compile_lock:
            if not binary.exists() or binary.stat().st_mtime < source.stat().st_mtime:
                run_engine(["/usr/bin/swiftc", "-module-cache-path", str(cache / "module-cache"), str(source), "-o", str(binary)], timeout=180)
        with engines:
            return merge_regions(json.loads(run_engine([str(binary), str(image_path)], timeout=60)))

    @application.get("/api/health")
    def health():
        supported = []
        if platform.system() == "Darwin":
            try:
                installed = run_engine(["/usr/bin/say", "-v", "?"], timeout=10)
                supported = [{"id": name, "label": label} for name, label in VOICE_OPTIONS.items() if name in installed]
            except HTTPException:
                pass
        return {"status": "ok", "platform": platform.system(), "ocr": "Apple Vision", "tts": "macOS Speech", "voices": supported, "storage": "SQLite"}

    @application.get("/api/projects")
    def list_projects():
        with db() as connection:
            rows = connection.execute("SELECT p.id,p.title,p.updated_at,p.revision,COUNT(d.id) AS line_count FROM projects p LEFT JOIN dialogue d ON d.project_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC").fetchall()
        return [dict(row) for row in rows]

    @application.post("/api/projects", status_code=201)
    def new_project(body: ProjectInput):
        project_id = str(uuid4())
        with db() as connection:
            connection.execute("INSERT INTO projects(id,title,created_at,updated_at) VALUES(?,?,?,?)", (project_id, body.title, now(), now()))
        return payload(project_id)

    @application.post("/api/projects/sample", status_code=201)
    def sample_project():
        sample = ROOT / "assets" / "sample-ocr.png"
        if not sample.exists():
            raise HTTPException(404, "예제 이미지가 없습니다. 직접 이미지를 업로드해 주세요.")
        project = new_project(ProjectInput(title="비가 그친 자리 · 1화"))
        filename = f"{uuid4().hex}.png"
        shutil.copyfile(sample, uploads / filename)
        with db() as connection:
            connection.execute("UPDATE projects SET image_file=?,revision=1 WHERE id=?", (filename, project["id"]))
        return payload(project["id"])

    @application.get("/api/projects/{project_id}")
    def get_project(project_id: UUID):
        return payload(project_id)

    @application.post("/api/projects/{project_id}/image")
    def upload_image(project_id: UUID, file: UploadFile):
        with editing(project_id):
            with db() as connection:
                project_row(connection, project_id)
            raw = file.file.read(MAX_UPLOAD + 1)
            if len(raw) > MAX_UPLOAD:
                raise HTTPException(413, "이미지는 12MB까지 업로드할 수 있습니다.")
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(BytesIO(raw)) as source:
                        if source.format not in {"PNG", "JPEG", "WEBP"}:
                            raise ValueError("Unsupported image format")
                        source.load()
                        image = ImageOps.exif_transpose(source).convert("RGB")
                        if min(image.size) < 100:
                            raise ValueError("Image is too small")
                        image.thumbnail((3200, 4800))
                        filename = f"{uuid4().hex}.png"
                        image.save(uploads / filename, "PNG")
            except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
                raise HTTPException(422, "100px 이상, 1,600만 화소 이하의 PNG·JPG·WebP 이미지를 선택해 주세요.") from error
            with db() as connection:
                connection.execute("DELETE FROM dialogue WHERE project_id=?", (str(project_id),))
                connection.execute("UPDATE projects SET image_file=?,revision=revision+1,updated_at=?,export_file=NULL,export_duration=NULL,ocr_count=0 WHERE id=?", (filename, now(), str(project_id)))
            return payload(project_id)

    @application.post("/api/projects/{project_id}/ocr")
    def extract_dialogue(project_id: UUID, body: RevisionInput):
        with editing(project_id):
            with db() as connection:
                row = project_row(connection, project_id)
                check_revision(row, body.revision)
                filename = row["image_file"]
            if not filename:
                raise HTTPException(422, "먼저 웹툰 이미지를 업로드해 주세요.")
            regions = recognize(uploads / filename)
            with db() as connection:
                connection.execute("DELETE FROM dialogue WHERE project_id=?", (str(project_id),))
                for position, region in enumerate(regions):
                    connection.execute("INSERT INTO dialogue(project_id,position,text,speaker,voice,rate,confidence,bbox) VALUES(?,?,?,?,?,?,?,?)", (str(project_id), position, region["text"][:500], "서윤" if position % 2 == 0 else "도윤", "Yuna" if position % 2 == 0 else "Eddy (한국어(한국))", 170, region["confidence"], json.dumps(region)))
                connection.execute("UPDATE projects SET revision=revision+1,updated_at=?,ocr_count=?,export_file=NULL,export_duration=NULL WHERE id=?", (now(), len(regions), str(project_id)))
            return payload(project_id)

    @application.put("/api/projects/{project_id}/lines")
    def save_dialogue(project_id: UUID, body: DialogueSave):
        if sum(len(line.text) for line in body.lines) > 6000:
            raise HTTPException(422, "프로젝트당 대사는 6,000자까지 저장할 수 있습니다.")
        with editing(project_id), db() as connection:
            row = project_row(connection, project_id)
            check_revision(row, body.revision)
            connection.execute("DELETE FROM dialogue WHERE project_id=?", (str(project_id),))
            for position, line in enumerate(body.lines):
                connection.execute("INSERT INTO dialogue(project_id,position,text,speaker,voice,rate) VALUES(?,?,?,?,?,?)", (str(project_id), position, line.text, line.speaker, line.voice, line.rate))
            connection.execute("UPDATE projects SET revision=revision+1,updated_at=?,export_file=NULL,export_duration=NULL WHERE id=?", (now(), str(project_id)))
        return payload(project_id)

    @application.post("/api/projects/{project_id}/synthesize")
    def synthesize(project_id: UUID, body: RevisionInput):
        mac_engine()
        with editing(project_id):
            with db() as connection:
                row = project_row(connection, project_id)
                check_revision(row, body.revision)
                lines = [dict(line) for line in connection.execute("SELECT * FROM dialogue WHERE project_id=? ORDER BY position", (str(project_id),))]
            if not lines:
                raise HTTPException(422, "먼저 대사를 추출하거나 직접 입력해 주세요.")
            outputs = []
            with engines, tempfile.TemporaryDirectory(prefix="speech-", dir=cache) as temporary:
                for line in lines:
                    aiff = Path(temporary) / f"{line['id']}.aiff"
                    filename = f"{uuid4().hex}.wav"
                    target = audios / filename
                    run_engine(["/usr/bin/say", "-v", line["voice"], "-r", str(line["rate"]), "-o", str(aiff)], input_text=line["text"], timeout=90)
                    run_engine(["/usr/bin/afconvert", "-f", "WAVE", "-d", "LEI16@24000", "-c", "1", str(aiff), str(target)], timeout=30)
                    duration, waveform = describe_wav(target)
                    outputs.append((filename, duration, json.dumps(waveform), line["id"]))
                export_name = f"{uuid4().hex}.wav"
                with wave.open(str(audios / export_name), "wb") as combined:
                    combined.setnchannels(1)
                    combined.setsampwidth(2)
                    combined.setframerate(24000)
                    for position, output in enumerate(outputs):
                        with wave.open(str(audios / output[0]), "rb") as segment:
                            combined.writeframes(segment.readframes(segment.getnframes()))
                        if position < len(outputs) - 1:
                            combined.writeframes(b"\x00\x00" * 8400)
                export_duration, _ = describe_wav(audios / export_name)
            with db() as connection:
                connection.executemany("UPDATE dialogue SET audio_file=?,duration=?,waveform=? WHERE id=?", outputs)
                connection.execute("UPDATE projects SET export_file=?,export_duration=?,updated_at=? WHERE id=?", (export_name, export_duration, now(), str(project_id)))
            return payload(project_id)

    @application.get("/api/projects/{project_id}/image")
    def project_image(project_id: UUID):
        with db() as connection:
            filename = project_row(connection, project_id)["image_file"]
        if not filename:
            raise HTTPException(404, "저장된 이미지가 없습니다.")
        return FileResponse(uploads / filename, media_type="image/png")

    @application.get("/api/projects/{project_id}/lines/{line_id}/audio")
    def line_audio(project_id: UUID, line_id: int):
        with db() as connection:
            line = connection.execute("SELECT audio_file FROM dialogue WHERE id=? AND project_id=?", (line_id, str(project_id))).fetchone()
        if not line or not line["audio_file"]:
            raise HTTPException(404, "아직 생성된 음성이 없습니다.")
        return FileResponse(audios / line["audio_file"], media_type="audio/wav")

    @application.get("/api/projects/{project_id}/export")
    def export_audio(project_id: UUID, download: bool = False):
        with db() as connection:
            filename = project_row(connection, project_id)["export_file"]
        if not filename:
            raise HTTPException(404, "먼저 전체 음성을 생성해 주세요.")
        return FileResponse(audios / filename, media_type="audio/wav", filename="toonvoice-dialogue.wav" if download else None)

    @application.get("/")
    def studio():
        return FileResponse(ROOT / "index.html", media_type="text/html")

    application.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")
    return application


app = create_app()
