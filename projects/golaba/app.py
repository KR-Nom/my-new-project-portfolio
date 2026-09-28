'''
작성자: 장현진 · AI 개발 도구 협업
작성일: 2026-09-28
변경사항: 지원사업 접수·SQLite 작업 큐·규칙 검수·담당자 판단 실행본 추가
프로그램: 기존 GOLABA 설계를 바탕으로 새로 구현한 로컬 포트폴리오 서비스
실행: python -m uvicorn app:app --host 127.0.0.1 --port 8317
'''
import asyncio
import hashlib
import json
import os
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

ROOT = Path(__file__).resolve().parent
COOKIE = 'golaba_session'
PROJECTS = [
    {'id': 'living-2026', 'title': '청년 생활 안심 지원', 'category': '생활복지', 'amount': 500000,
     'description': '생활 계획을 세우는 청년을 위한 예시 지원사업입니다. 실제 접수·지급 사업이 아닙니다.',
     'documents': [{'key': 'eligibility', 'label': '지원 자격 확인서'}, {'key': 'plan', 'label': '생활 계획서'}]},
    {'id': 'career-2026', 'title': '첫 커리어 성장 지원', 'category': '취업·성장', 'amount': 1200000,
     'description': '학습과 구직 활동 계획을 검토하는 합성 지원사업입니다. 공개 시연용으로 구성했습니다.',
     'documents': [{'key': 'eligibility', 'label': '지원 자격 확인서'}, {'key': 'plan', 'label': '구직 활동 계획서'}]},
    {'id': 'startup-2026', 'title': '로컬 아이디어 실험실', 'category': '창업·R&D', 'amount': 3000000,
     'description': '지역 문제를 해결하는 아이디어의 실험 계획을 접수합니다. 모든 내용은 합성 예제입니다.',
     'documents': [{'key': 'eligibility', 'label': '참여 자격 확인서'}, {'key': 'plan', 'label': '사업 계획서'},
                   {'key': 'budget', 'label': '예산 사용 계획서'}]},
]


class ApplicationInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    project_id: str = Field(min_length=1, max_length=40)
    applicant_name: str = Field(min_length=2, max_length=50)
    purpose: str = Field(min_length=20, max_length=2000)
    documents: dict[str, str] = Field(default_factory=dict, max_length=5)

    @field_validator('documents')
    @classmethod
    def bounded_documents(cls, values):
        if any(len(key) > 40 or len(text) > 5000 for key, text in values.items()):
            raise ValueError('증빙 항목은 5,000자 이하로 입력하세요.')
        return {key: text.strip() for key, text in values.items()}


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    decision: str = Field(pattern='^(APPROVED|NEEDS_SUPPLEMENT)$')
    reason: str = Field(min_length=5, max_length=1000)
    revision: int = Field(ge=1)


class ReviewerLogin(BaseModel):
    model_config = ConfigDict(extra='forbid')
    token: str = Field(min_length=16, max_length=256)


def create_app(database_path=None, reviewer_token=None, start_worker=True):
    database = Path(database_path or os.environ.get('GOLABA_DB', ROOT / 'runtime/golaba.sqlite3'))
    token = reviewer_token if reviewer_token is not None else os.environ.get('GOLABA_REVIEWER_TOKEN', '')

    @contextmanager
    def connect():
        database.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(database, timeout=10)
        con.row_factory = sqlite3.Row
        con.execute('PRAGMA foreign_keys=ON')
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def initialize():
        with connect() as con:
            con.execute('PRAGMA journal_mode=WAL')
            con.executescript('''
                CREATE TABLE IF NOT EXISTS sessions (
                    owner TEXT PRIMARY KEY, expires REAL NOT NULL, reviewer_until REAL NOT NULL DEFAULT 0,
                    failed_logins INTEGER NOT NULL DEFAULT 0, login_window REAL NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS applications (
                    id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(owner),
                    project_id TEXT NOT NULL, applicant_name TEXT NOT NULL, purpose TEXT NOT NULL,
                    documents TEXT NOT NULL, status TEXT NOT NULL, revision INTEGER NOT NULL,
                    checks TEXT, reviewer_reason TEXT, created_at REAL NOT NULL, updated_at REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS applications_owner ON applications(owner);
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
                    revision INTEGER NOT NULL, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                    lease_until REAL NOT NULL DEFAULT 0, claim TEXT, error TEXT,
                    UNIQUE(application_id, revision));
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
                    revision INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at REAL NOT NULL);
            ''')

    def event(con, application_id, revision, action, detail):
        con.execute('INSERT INTO events(application_id,revision,action,detail,created_at) VALUES (?,?,?,?,?)',
                    (application_id, revision, action, detail, time.time()))

    def project(project_id):
        for item in PROJECTS:
            if item['id'] == project_id:
                return item
        raise HTTPException(404, '지원사업을 찾지 못했습니다.')

    def verify_submission(body):
        allowed = {entry['key'] for entry in project(body.project_id)['documents']}
        if not set(body.documents).issubset(allowed):
            raise HTTPException(422, '이 사업에 없는 증빙 항목입니다.')

    def owner(request):
        raw = request.cookies.get(COOKIE, '')
        hashed = hashlib.sha256(raw.encode()).hexdigest()
        with connect() as con:
            found = con.execute('SELECT * FROM sessions WHERE owner=? AND expires>?', (hashed, time.time())).fetchone()
        if not found:
            raise HTTPException(401, '화면을 새로고침한 뒤 다시 시도하세요.')
        return dict(found)

    def reviewer(request):
        session = owner(request)
        if not token or len(token) < 16 or session['reviewer_until'] < time.time():
            raise HTTPException(403, '담당자 인증이 필요합니다.')
        return session

    def serialize(con, row, include_events=False):
        result = dict(row)
        result.pop('owner', None)
        result['documents'] = json.loads(result['documents'])
        result['checks'] = json.loads(result['checks']) if result['checks'] else None
        result['project_title'] = project(result['project_id'])['title']
        if include_events:
            result['events'] = [dict(entry) for entry in con.execute(
                'SELECT revision,action,detail,created_at FROM events WHERE application_id=? ORDER BY id', (row['id'],))]
        return result

    def process_one():
        claim = secrets.token_hex(16)
        with connect() as con:
            con.execute('BEGIN IMMEDIATE')
            job = con.execute("SELECT * FROM jobs WHERE state='QUEUED' OR (state='RUNNING' AND lease_until<?) ORDER BY id LIMIT 1", (time.time(),)).fetchone()
            if not job:
                return False
            con.execute("UPDATE jobs SET state='RUNNING',attempts=attempts+1,lease_until=?,claim=? WHERE id=?",
                        (time.time() + 30, claim, job['id']))
            row = con.execute('SELECT * FROM applications WHERE id=?', (job['application_id'],)).fetchone()
        try:
            documents = json.loads(row['documents'])
            checks = [{'key': entry['key'], 'label': entry['label'],
                       'passed': len(documents.get(entry['key'], '').strip()) >= 20,
                       'reason': '텍스트 20자 이상 확인' if len(documents.get(entry['key'], '').strip()) >= 20
                       else '증빙 내용을 20자 이상 입력해 주세요.'}
                      for entry in project(row['project_id'])['documents']]
            status = 'READY' if all(check['passed'] for check in checks) else 'NEEDS_SUPPLEMENT'
            with connect() as con:
                con.execute('BEGIN IMMEDIATE')
                active = con.execute("SELECT * FROM jobs WHERE id=? AND claim=? AND state='RUNNING'", (job['id'], claim)).fetchone()
                if not active:
                    return True
                changed = con.execute("UPDATE applications SET status=?,checks=?,updated_at=? WHERE id=? AND revision=? AND status='CHECKING'",
                    (status, json.dumps(checks, ensure_ascii=False), time.time(), row['id'], job['revision'])).rowcount
                con.execute("UPDATE jobs SET state='DONE',lease_until=0 WHERE id=?", (job['id'],))
                if changed:
                    event(con, row['id'], job['revision'], 'PRECHECK_COMPLETED',
                          '규칙 기반 사전 점검 완료 · 증빙 진위·자격 판단은 담당자 확인 필요')
            return True
        except Exception:
            with connect() as con:
                active = con.execute("SELECT attempts FROM jobs WHERE id=? AND claim=? AND state='RUNNING'", (job['id'], claim)).fetchone()
                if active:
                    failed = active['attempts'] >= 3
                    con.execute('UPDATE jobs SET state=?,error=?,lease_until=0 WHERE id=? AND claim=?',
                                ('FAILED' if failed else 'QUEUED', '사전 점검 처리 오류', job['id'], claim))
                    if failed:
                        con.execute("UPDATE applications SET status='CHECK_FAILED',updated_at=? WHERE id=? AND revision=? AND status='CHECKING'", (time.time(), row['id'], job['revision']))
            return True

    async def worker():
        while True:
            try:
                await asyncio.to_thread(process_one)
            except sqlite3.OperationalError:
                # 일시적인 DB 잠금은 작업을 버리지 않고 다음 순회에서 다시 확인한다.
                await asyncio.sleep(1)
            await asyncio.sleep(0.4)

    @asynccontextmanager
    async def lifespan(app):
        initialize()
        task = asyncio.create_task(worker()) if start_worker else None
        try:
            yield
        finally:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    app = FastAPI(title='GOLABA local portfolio', lifespan=lifespan)
    app.state.process_one = process_one
    app.state.connect = connect

    @app.middleware('http')
    async def local_boundary(request, call_next):
        if request.url.hostname not in {'127.0.0.1', 'localhost', 'testserver'}:
            return Response('로컬 호스트만 허용합니다.', 400)
        if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
            origin = request.headers.get('origin')
            expected = f'{request.url.scheme}://{request.headers.get("host", "")}'
            if origin and origin.rstrip('/') != expected:
                return Response('다른 출처의 변경 요청은 허용하지 않습니다.', 403)
            try:
                if int(request.headers.get('content-length', '0')) > 40000:
                    return Response('요청이 너무 큽니다.', 413)
            except ValueError:
                return Response('잘못된 요청 길이입니다.', 400)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.get('/')
    def home():
        return FileResponse(ROOT / 'static/index.html')

    @app.get('/api/health')
    def health():
        return {'status': 'ok', 'database': 'sqlite', 'precheck': 'rules', 'dataset': 'synthetic',
                'worker': start_worker, 'reviewer_configured': len(token) >= 16}

    @app.get('/api/session')
    def session(request: Request, response: Response):
        try:
            record = owner(request)
        except HTTPException:
            raw = secrets.token_urlsafe(32)
            hashed = hashlib.sha256(raw.encode()).hexdigest()
            with connect() as con:
                con.execute('INSERT INTO sessions(owner,expires) VALUES (?,?)', (hashed, time.time() + 86400 * 7))
            response.set_cookie(COOKIE, raw, max_age=86400 * 7, httponly=True, samesite='lax')
            record = {'reviewer_until': 0}
        return {'reviewer': bool(token and len(token) >= 16 and record['reviewer_until'] > time.time()),
                'reviewer_configured': len(token) >= 16, 'mode': 'local-demo'}

    @app.get('/api/projects')
    def projects():
        return PROJECTS

    @app.post('/api/applications', status_code=202)
    def submit(body: ApplicationInput, request: Request):
        session = owner(request)
        verify_submission(body)
        identifier = secrets.token_hex(8)
        now = time.time()
        with connect() as con:
            con.execute('BEGIN IMMEDIATE')
            existing = con.execute("SELECT id FROM applications WHERE owner=? AND project_id=? AND status!='APPROVED'", (session['owner'], body.project_id)).fetchone()
            if existing:
                raise HTTPException(409, '이 사업에 진행 중인 신청이 있습니다. 내 신청에서 확인해 주세요.')
            approved = con.execute("SELECT id FROM applications WHERE owner=? AND project_id=? AND status='APPROVED'", (session['owner'], body.project_id)).fetchone()
            if approved:
                raise HTTPException(409, '이미 승인된 지원사업입니다.')
            con.execute('INSERT INTO applications(id,owner,project_id,applicant_name,purpose,documents,status,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)',
                (identifier, session['owner'], body.project_id, body.applicant_name, body.purpose,
                 json.dumps(body.documents, ensure_ascii=False), 'CHECKING', now, now))
            con.execute("INSERT INTO jobs(application_id,revision,state) VALUES (?,1,'QUEUED')", (identifier,))
            event(con, identifier, 1, 'SUBMITTED', '접수 완료 · 규칙 기반 사전 점검 대기')
        return {'id': identifier, 'status': 'CHECKING', 'revision': 1}

    @app.get('/api/applications')
    def applications(request: Request):
        session = owner(request)
        with connect() as con:
            return [serialize(con, row) for row in con.execute('SELECT * FROM applications WHERE owner=? ORDER BY created_at DESC', (session['owner'],))]

    @app.get('/api/applications/{identifier}')
    def application(identifier: str, request: Request):
        session = owner(request)
        with connect() as con:
            row = con.execute('SELECT * FROM applications WHERE id=? AND owner=?', (identifier, session['owner'])).fetchone()
            if not row:
                raise HTTPException(404, '신청을 찾지 못했습니다.')
            return serialize(con, row, True)

    @app.put('/api/applications/{identifier}', status_code=202)
    def supplement(identifier: str, body: ApplicationInput, request: Request):
        session = owner(request)
        verify_submission(body)
        with connect() as con:
            con.execute('BEGIN IMMEDIATE')
            row = con.execute('SELECT * FROM applications WHERE id=? AND owner=?', (identifier, session['owner'])).fetchone()
            if not row:
                raise HTTPException(404, '신청을 찾지 못했습니다.')
            if row['status'] not in {'NEEDS_SUPPLEMENT', 'CHECK_FAILED'}:
                raise HTTPException(409, '보완 요청 또는 점검 실패 상태에서만 다시 제출할 수 있습니다.')
            if row['project_id'] != body.project_id:
                raise HTTPException(422, '지원사업은 변경할 수 없습니다.')
            revision = row['revision'] + 1
            con.execute("UPDATE applications SET applicant_name=?,purpose=?,documents=?,revision=?,status='CHECKING',checks=NULL,reviewer_reason=NULL,updated_at=? WHERE id=?",
                (body.applicant_name, body.purpose, json.dumps(body.documents, ensure_ascii=False), revision, time.time(), identifier))
            con.execute("INSERT INTO jobs(application_id,revision,state) VALUES (?,?,'QUEUED')", (identifier, revision))
            event(con, identifier, revision, 'RESUBMITTED', '보완 내용 제출 · 사전 점검 재요청')
        return {'id': identifier, 'revision': revision, 'status': 'CHECKING'}

    @app.post('/api/reviewer/session')
    def reviewer_login(body: ReviewerLogin, request: Request):
        record = owner(request)
        if len(token) < 16:
            raise HTTPException(503, '서버에 16자 이상의 담당자 토큰을 설정해 주세요.')
        now = time.time()
        with connect() as con:
            con.execute('BEGIN IMMEDIATE')
            record = dict(con.execute('SELECT * FROM sessions WHERE owner=?', (record['owner'],)).fetchone())
            failures = record['failed_logins'] if now - record['login_window'] < 60 else 0
            if failures >= 5:
                raise HTTPException(429, '잠시 후 다시 시도하세요.')
            valid = secrets.compare_digest(body.token, token)
            con.execute('UPDATE sessions SET failed_logins=?,login_window=?,reviewer_until=? WHERE owner=?',
                (0 if valid else failures + 1, record['login_window'] if failures else now,
                 now + 3600 if valid else record['reviewer_until'], record['owner']))
        if not valid:
            raise HTTPException(403, '담당자 토큰을 확인해 주세요.')
        return {'reviewer': True, 'expires_in': 3600}

    @app.delete('/api/reviewer/session')
    def reviewer_logout(request: Request):
        record = owner(request)
        with connect() as con:
            con.execute('UPDATE sessions SET reviewer_until=0 WHERE owner=?', (record['owner'],))
        return {'reviewer': False}

    @app.get('/api/reviewer/applications')
    def review_list(request: Request):
        reviewer(request)
        with connect() as con:
            return [serialize(con, row, True) for row in con.execute('SELECT * FROM applications ORDER BY updated_at DESC LIMIT 200')]

    @app.post('/api/reviewer/applications/{identifier}/decision')
    def decide(identifier: str, body: ReviewInput, request: Request):
        reviewer(request)
        with connect() as con:
            con.execute('BEGIN IMMEDIATE')
            row = con.execute('SELECT * FROM applications WHERE id=?', (identifier,)).fetchone()
            if not row:
                raise HTTPException(404, '신청을 찾지 못했습니다.')
            if row['revision'] != body.revision or row['status'] not in {'READY', 'NEEDS_SUPPLEMENT'}:
                raise HTTPException(409, '신청 상태가 변경되었습니다. 다시 조회해 주세요.')
            if body.decision == 'APPROVED' and row['status'] != 'READY':
                raise HTTPException(409, '필수 증빙의 사전 점검을 통과한 신청만 승인할 수 있습니다.')
            con.execute('UPDATE applications SET status=?,reviewer_reason=?,updated_at=? WHERE id=?', (body.decision, body.reason, time.time(), identifier))
            event(con, identifier, row['revision'], 'REVIEWER_' + body.decision, body.reason)
        return {'id': identifier, 'status': body.decision, 'revision': body.revision}

    app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')
    return app


app = create_app()
