'''작성자: 장현진 · 작성일: 2026-09-28
기존 CourtCast 화면 설계를 공식 시설 데이터와 연결한 신규 로컬 서비스.
실행: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8313
'''

import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import urlencode
from urllib.request import Request as URLRequest, urlopen

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("COURTCAST_DB", str(ROOT / "runtime" / "courtcast.sqlite3")))
WEATHER_TTL = 900
SOURCE_URL = "https://data.seoul.go.kr/dataList/OA-2266/S/1/datasetView.do"


def utcnow():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connection():
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connection() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript("""
        CREATE TABLE IF NOT EXISTS courts (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, district TEXT NOT NULL,
            latitude REAL NOT NULL, longitude REAL NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reservation_services (
            id TEXT PRIMARY KEY, court_id TEXT NOT NULL REFERENCES courts(id),
            title TEXT NOT NULL, status TEXT NOT NULL, url TEXT NOT NULL,
            payment TEXT NOT NULL, opening_time TEXT, closing_time TEXT
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT, court_id TEXT NOT NULL REFERENCES courts(id),
            session_id TEXT NOT NULL, condition TEXT NOT NULL
                CHECK(condition IN ('dry','wet','puddles','closed')),
            note TEXT NOT NULL DEFAULT '', is_demo INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_reports_court ON reports(court_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS favorites (
            session_id TEXT NOT NULL, court_id TEXT NOT NULL REFERENCES courts(id),
            created_at TEXT NOT NULL, PRIMARY KEY(session_id, court_id)
        );
        CREATE TABLE IF NOT EXISTS weather_cache (
            court_id TEXT PRIMARY KEY REFERENCES courts(id), payload TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        );
        """)
        for court in json.loads((ROOT / "data" / "courts.json").read_text()):
            db.execute("INSERT OR IGNORE INTO courts VALUES (?,?,?,?,?,?)", (
                court["id"], court["name"], court["district"], court["latitude"],
                court["longitude"], json.dumps(court, ensure_ascii=False),
            ))
        for service in json.loads((ROOT / "data" / "services.json").read_text()):
            db.execute("INSERT OR IGNORE INTO reservation_services VALUES (?,?,?,?,?,?,?,?)", (
                service["id"], service["court_id"], service["title"], service["status"],
                service["url"], service["payment"], service["opening_time"], service["closing_time"],
            ))


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(title="CourtCast API", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def browser_session(request: Request, call_next):
    # No name, email, location history, or login token is collected.
    token = request.cookies.get("courtcast_session", "")
    new_session = len(token) != 64 or any(c not in "0123456789abcdef" for c in token)
    if new_session:
        token = secrets.token_hex(32)
    request.state.session_id = hashlib.sha256(token.encode()).hexdigest()
    if request.method in {"POST", "DELETE", "PUT", "PATCH"}:
        origin = request.headers.get("origin")
        if origin and origin != str(request.base_url).rstrip("/"):
            return JSONResponse({"detail": "같은 사이트에서 요청해 주세요."}, status_code=403)
    response = await call_next(request)
    if new_session:
        response.set_cookie("courtcast_session", token, httponly=True, samesite="lax",
                            secure=request.url.scheme == "https", max_age=60 * 60 * 24 * 90)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


def get_court(db, court_id):
    row = db.execute("SELECT * FROM courts WHERE id = ?", (court_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "코트를 찾을 수 없습니다.")
    return json.loads(row["payload"])


def report_rows(db, court_id, session_id):
    rows = db.execute("SELECT id,condition,note,is_demo,created_at,session_id FROM reports WHERE court_id=? ORDER BY id DESC LIMIT 30", (court_id,)).fetchall()
    return [{"id": r["id"], "condition": r["condition"], "note": r["note"],
             "is_demo": bool(r["is_demo"]), "created_at": r["created_at"],
             "is_mine": r["session_id"] == session_id} for r in rows]


@app.get("/api/health")
def health():
    with connection() as db:
        return {"status": "ok", "database": "sqlite", "courts": db.execute("SELECT COUNT(*) FROM courts").fetchone()[0],
                "reservation_services": db.execute("SELECT COUNT(*) FROM reservation_services").fetchone()[0]}


@app.get("/api/courts")
def list_courts(request: Request, q: str = "", district: str = "", favorites: bool = False):
    if len(q) > 80 or len(district) > 30:
        raise HTTPException(422, "검색어가 너무 깁니다.")
    with connection() as db:
        saved = {r[0] for r in db.execute("SELECT court_id FROM favorites WHERE session_id=?", (request.state.session_id,))}
        rows = db.execute("SELECT payload FROM courts ORDER BY district,name").fetchall()
        all_courts = [json.loads(r[0]) for r in rows]
        result = []
        for court in all_courts:
            if q and q.casefold() not in (court["name"] + court["district"]).casefold():
                continue
            if district and court["district"] != district:
                continue
            if favorites and court["id"] not in saved:
                continue
            court["is_favorite"] = court["id"] in saved
            court["report_count"] = db.execute("SELECT COUNT(*) FROM reports WHERE court_id=? AND is_demo=0", (court["id"],)).fetchone()[0]
            court["service_count"] = len(court["service_ids"])
            result.append(court)
        return {"items": result, "count": len(result), "total": len(all_courts),
                "favorite_count": len(saved), "districts": sorted({c["district"] for c in all_courts}),
                "source_url": SOURCE_URL, "source_date": "2026-09-28"}


@app.get("/api/courts/{court_id}")
def court_detail(court_id: str, request: Request):
    with connection() as db:
        court = get_court(db, court_id)
        court["services"] = [dict(r) for r in db.execute("SELECT id,title,status,url,payment,opening_time,closing_time FROM reservation_services WHERE court_id=? ORDER BY status='접수중' DESC,title", (court_id,))]
        court["reports"] = report_rows(db, court_id, request.state.session_id)
        return court


@app.get("/api/courts/{court_id}/reports")
def list_reports(court_id: str, request: Request):
    with connection() as db:
        get_court(db, court_id)
        return {"items": report_rows(db, court_id, request.state.session_id)}


class ReportInput(BaseModel):
    condition: Literal["dry", "wet", "puddles", "closed"]
    note: str = Field(default="", max_length=200)
    is_demo: bool = False


@app.post("/api/courts/{court_id}/reports", status_code=201)
def add_report(court_id: str, payload: ReportInput, request: Request):
    with connection() as db:
        get_court(db, court_id)
        created_at = utcnow()
        cursor = db.execute("INSERT INTO reports(court_id,session_id,condition,note,is_demo,created_at) VALUES (?,?,?,?,?,?)",
                            (court_id, request.state.session_id, payload.condition, payload.note.strip(), int(payload.is_demo), created_at))
        return {"id": cursor.lastrowid, "court_id": court_id, "created_at": created_at, **payload.model_dump()}


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int, request: Request):
    with connection() as db:
        result = db.execute("DELETE FROM reports WHERE id=? AND session_id=?", (report_id, request.state.session_id))
        if result.rowcount == 0:
            raise HTTPException(404, "이 브라우저에서 작성한 제보를 찾을 수 없습니다.")
        return {"deleted": report_id}


@app.post("/api/favorites/{court_id}")
def add_favorite(court_id: str, request: Request):
    with connection() as db:
        get_court(db, court_id)
        db.execute("INSERT OR IGNORE INTO favorites VALUES (?,?,?)", (request.state.session_id, court_id, utcnow()))
        return {"court_id": court_id, "is_favorite": True}


@app.delete("/api/favorites/{court_id}")
def delete_favorite(court_id: str, request: Request):
    with connection() as db:
        get_court(db, court_id)
        db.execute("DELETE FROM favorites WHERE session_id=? AND court_id=?", (request.state.session_id, court_id))
        return {"court_id": court_id, "is_favorite": False}


def weather_result(payload, fetched_at, mode, court):
    return {"mode": mode, "fetched_at": fetched_at, "ttl_seconds": WEATHER_TTL,
            "request_coordinates": {"latitude": court["latitude"], "longitude": court["longitude"]},
            "source": "Open-Meteo", "source_url": "https://open-meteo.com/", "forecast": payload}


@app.get("/api/courts/{court_id}/weather")
def weather(court_id: str):
    with connection() as db:
        court = get_court(db, court_id)
        cached = db.execute("SELECT payload,fetched_at FROM weather_cache WHERE court_id=?", (court_id,)).fetchone()
    if cached:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached["fetched_at"])).total_seconds()
        if age < WEATHER_TTL:
            return weather_result(json.loads(cached["payload"]), cached["fetched_at"], "cache", court)
    query = urlencode({"latitude": round(court["latitude"], 6), "longitude": round(court["longitude"], 6),
                       "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
                       "hourly": "temperature_2m,precipitation_probability,precipitation",
                       "forecast_days": 2, "timezone": "Asia/Seoul"})
    try:
        request = URLRequest("https://api.open-meteo.com/v1/forecast?" + query, headers={"User-Agent": "CourtCast-Educational-Prototype/1.0"})
        with urlopen(request, timeout=6) as response:
            payload = json.loads(response.read())
        if not isinstance(payload.get("current"), dict) or not isinstance(payload.get("hourly"), dict):
            raise ValueError("Invalid forecast structure")
        fetched_at = utcnow()
        with connection() as db:
            db.execute("INSERT INTO weather_cache VALUES(?,?,?) ON CONFLICT(court_id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at",
                       (court_id, json.dumps(payload), fetched_at))
        return weather_result(payload, fetched_at, "live", court)
    except (OSError, ValueError, KeyError):
        if cached:
            return weather_result(json.loads(cached["payload"]), cached["fetched_at"], "stale", court)
        raise HTTPException(503, "예보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")


@app.get("/")
def index():
    return FileResponse(ROOT / "frontend" / "index.html")


app.mount("/assets", StaticFiles(directory=ROOT / "frontend"), name="assets")
