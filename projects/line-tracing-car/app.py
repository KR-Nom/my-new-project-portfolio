'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 데이터 수집 세션 API, SQLite 조회, 브라우저 화면 추가
설명: 공개 데모와 직접 업로드한 주행 이미지·조작값을 구분해 저장한다.
실행: python -m uvicorn app:app --host 127.0.0.1 --port 8022
'''
import io
import os
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from dataset import MAX_ARCHIVE, connect, export_csv, initialize, read_archive, save_session, seed_demo

ROOT = Path(__file__).resolve().parent


def create_app(data_dir=None):
    directory = Path(data_dir or os.getenv("RC_DATA_DIR", ROOT / "data")).resolve()

    @asynccontextmanager
    async def lifespan(_app):
        initialize(directory)
        seed_demo(directory, ROOT / "sample-data")
        yield

    service = FastAPI(title="RC 주행 데이터 스튜디오", lifespan=lifespan)
    service.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

    @service.get("/")
    def home():
        return FileResponse(ROOT / "static" / "index.html")

    @service.get("/api/health")
    def health():
        with connect(directory) as db:
            count = db.execute("SELECT count(*) FROM frames").fetchone()[0]
        return {"status": "ok", "frames": count, "hardware_connected": False}

    @service.get("/api/sessions")
    def sessions():
        with connect(directory) as db:
            rows = db.execute("""SELECT s.*, count(f.id) AS frame_count,
                min(f.timestamp_ms) AS start_ms, max(f.timestamp_ms) AS end_ms
                FROM sessions s LEFT JOIN frames f ON f.session_id=s.id
                GROUP BY s.id ORDER BY s.created_at DESC, s.id""").fetchall()
        return [dict(row) for row in rows]

    @service.get("/api/sessions/{session_id}")
    def session(session_id: str):
        with connect(directory) as db:
            record = db.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
            if record is None:
                raise HTTPException(404, "세션을 찾을 수 없습니다.")
            rows = db.execute("SELECT * FROM frames WHERE session_id=? ORDER BY timestamp_ms", (session_id,)).fetchall()
        frames = []
        for row in rows:
            frame = dict(row)
            frame.pop("stored_name")
            frame["image_url"] = f"/api/frames/{frame['id']}/image"
            frames.append(frame)
        return {**dict(record), "frames": frames}

    @service.get("/api/frames/{frame_id}/image")
    def image(frame_id: str):
        with connect(directory) as db:
            row = db.execute("SELECT stored_name FROM frames WHERE id=?", (frame_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "이미지를 찾을 수 없습니다.")
        return FileResponse(directory / "images" / row["stored_name"], headers={"X-Content-Type-Options": "nosniff"})

    @service.get("/api/sessions/{session_id}/csv")
    def download_csv(session_id: str):
        record = session(session_id)
        return Response(export_csv(record["frames"]), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="frames.csv"'})

    @service.get("/api/example.zip")
    def example_archive():
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            for file in (ROOT / "sample-data").rglob("*"):
                if file.is_file():
                    archive.write(file, file.relative_to(ROOT / "sample-data"))
        return Response(output.getvalue(), media_type="application/zip",
                        headers={"Content-Disposition": 'attachment; filename="rc-example.zip"'})

    @service.post("/api/sessions", status_code=201)
    async def upload_session(request: Request, name: str):
        if not name.strip() or len(name.strip()) > 100:
            raise HTTPException(422, "세션 이름은 1~100자여야 합니다.")
        content = bytearray()
        async for chunk in request.stream():
            content.extend(chunk)
            if len(content) > MAX_ARCHIVE:
                raise HTTPException(413, "ZIP은 24MB 이하여야 합니다.")
        try:
            frames = await run_in_threadpool(read_archive, bytes(content))
            session_id = await run_in_threadpool(save_session, directory, name, frames)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
        return {"id": session_id, "frame_count": len(frames)}

    return service


app = create_app()
