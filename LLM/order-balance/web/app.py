"""Order Balance: deterministic purchasing with persisted approval and optional LLM review."""
import csv
import io
import json
import math
import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()
ROOT = Path(__file__).parent
STATE = Path(os.environ.get('ORDER_STATE', ROOT / 'state'))
STATE.mkdir(parents=True, exist_ok=True)
DB = STATE / 'orders.sqlite'
app = FastAPI(title='Order Balance', version='1.0.0')
LOCAL = os.environ.get('AI_PROVIDER') == 'local'


@contextmanager
def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    try:
        yield con
        con.commit()
    finally:
        con.close()


with db() as con:
    con.executescript('''CREATE TABLE IF NOT EXISTS inventory(id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, budget INTEGER NOT NULL,
      total INTEGER NOT NULL, status TEXT NOT NULL, items TEXT NOT NULL, review TEXT, llm_usage TEXT);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, run_id INTEGER REFERENCES runs(id),
      action TEXT NOT NULL, created_at TEXT NOT NULL);''')
    if not con.execute('SELECT COUNT(*) FROM inventory').fetchone()[0]:
        with (ROOT.parent / 'data' / '06_통합발주분석.csv').open(encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                con.execute('INSERT INTO inventory VALUES(?,?)', (row['item_id'], json.dumps(row, ensure_ascii=False)))


def now():
    return datetime.now(timezone.utc).isoformat()


def inventory():
    with db() as con:
        return [json.loads(r[0]) for r in con.execute('SELECT data FROM inventory ORDER BY id')]


def calculate(rows, budget):
    """Greedy risk-first allocation; prices and order multiples are integer constraints."""
    remaining = budget
    result = []
    ranked = sorted(rows, key=lambda r: (r['stockout_risk_yn'] != 'TRUE',
                    r['stockout_warning_yn'] != 'TRUE', float(r['inventory_cover_days']), r['item_id']))
    for row in ranked:
        unit = int(row['unit_cost_krw'])
        multiple = int(float(row['order_multiple_qty']))
        minimum = int(float(row['min_order_qty']))
        maximum = int(float(row['max_order_qty']))
        demand = float(row['avg_daily_quantity_long']) * (
            float(row['lead_time_days']) + float(row['review_period_days']) + float(row['safety_stock_days']))
        needed = max(0, demand - float(row['inventory_position_qty']))
        minimum_multiple = math.ceil(minimum / multiple) * multiple
        desired = min(maximum // multiple * multiple, max(minimum_multiple, math.ceil(needed / multiple) * multiple)) if needed else 0
        qty = min(desired, remaining // (unit * multiple) * multiple)
        if qty < minimum:
            qty = 0
        if not desired:
            continue
        cost = qty * unit
        remaining -= cost
        risk = '품절 위험' if row['stockout_risk_yn'] == 'TRUE' else '소비기한 주의' if row['waste_risk_yn'] == 'TRUE' else '재고 보충'
        reason = f"평균 {float(row['avg_daily_quantity_long']):.2f}개/일 · 재고 {float(row['inventory_position_qty']):g}개"
        if qty < desired:
            reason += f' · 예산 한도로 {desired}→{qty}개 조정'
        result.append({'id': row['item_id'], 'name': row['item_name'], 'category': row['category_l1'],
            'unit_cost': unit, 'multiple': multiple, 'minimum': minimum, 'maximum': maximum,
            'desired': desired, 'quantity': qty, 'cost': cost, 'risk': risk, 'reason': reason,
            'cover_days': float(row['inventory_cover_days']), 'available': float(row['available_qty'])})
    return result


def get_run(run_id):
    with db() as con:
        row = con.execute('SELECT * FROM runs WHERE id=?', (run_id,)).fetchone()
    if not row:
        raise HTTPException(404, '검토 이력이 없습니다.')
    d = dict(row)
    d['items'] = json.loads(d['items'])
    d['llm_usage'] = json.loads(d['llm_usage']) if d['llm_usage'] else None
    return d


@app.get('/')
def home():
    return FileResponse(ROOT / 'index.html')


@app.get('/api/inventory')
def list_inventory():
    rows = inventory()
    return {'items': rows, 'count': len(rows), 'snapshot': rows[0]['snapshot_date'] if rows else '',
            'stockout': sum(r['stockout_risk_yn'] == 'TRUE' for r in rows),
            'expiry': sum(r['waste_risk_yn'] == 'TRUE' for r in rows), 'source': '매장 ST001 합성 데이터'}


@app.post('/api/inventory')
async def import_csv(file: UploadFile):
    raw = await file.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(413, 'CSV는 2MB 이하여야 합니다.')
    try:
        rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
        if not rows or len(rows) > 1000 or len({r['item_id'] for r in rows}) != len(rows):
            raise ValueError('invalid row count or duplicate ids')
        required = set(inventory()[0])
        for row in rows:
            if not required.issubset(row) or not row['item_id'] or not row['item_name']:
                raise ValueError('missing columns')
            for key in ['unit_cost_krw', 'order_multiple_qty', 'min_order_qty', 'max_order_qty']:
                val = float(row[key])
                if not math.isfinite(val) or val <= 0 or not val.is_integer():
                    raise ValueError('invalid integer')
            minimum, maximum, multiple = (int(float(row[k])) for k in ['min_order_qty', 'max_order_qty', 'order_multiple_qty'])
            if minimum > maximum or math.ceil(minimum / multiple) * multiple > maximum:
                raise ValueError('no valid order quantity')
            for key in ['avg_daily_quantity_long','lead_time_days','review_period_days','safety_stock_days',
                        'inventory_position_qty','inventory_cover_days','available_qty']:
                val = float(row[key])
                if not math.isfinite(val) or val < 0:
                    raise ValueError('invalid quantity')
        calculate(rows, 500000)
    except Exception:
        raise HTTPException(422, '통합발주분석 CSV 형식과 양수 단가·주문 배수·중복 품목을 확인해 주세요.') from None
    with db() as con:
        con.execute('DELETE FROM inventory')
        con.executemany('INSERT INTO inventory VALUES(?,?)', [(r['item_id'], json.dumps(r, ensure_ascii=False)) for r in rows])
    return {'count': len(rows)}


class RunRequest(BaseModel):
    budget: int = Field(default=500000, ge=0, le=100000000)


@app.post('/api/runs', status_code=201)
def create_run(body: RunRequest):
    items = calculate(inventory(), body.budget)
    with db() as con:
        run_id = con.execute('INSERT INTO runs(created_at,budget,total,status,items) VALUES(?,?,?,?,?)',
            (now(), body.budget, sum(i['cost'] for i in items), '검토 중', json.dumps(items, ensure_ascii=False))).lastrowid
        con.execute('INSERT INTO events(run_id,action,created_at) VALUES(?,?,?)', (run_id, '발주 초안 생성', now()))
    return get_run(run_id)


@app.get('/api/runs')
def runs():
    with db() as con:
        return [dict(r) for r in con.execute('SELECT id,created_at,budget,total,status FROM runs ORDER BY id DESC')]


@app.get('/api/runs/{run_id}')
def run(run_id: int):
    return get_run(run_id)


class Adjustment(BaseModel):
    quantities: dict[str, int]


@app.patch('/api/runs/{run_id}')
def adjust(run_id: int, body: Adjustment):
    run = get_run(run_id)
    if run['status'] != '검토 중':
        raise HTTPException(409, '확정한 발주서는 수정할 수 없습니다.')
    if set(body.quantities) - {i['id'] for i in run['items']}:
        raise HTTPException(422, '알 수 없는 품목입니다.')
    for item in run['items']:
        q = body.quantities.get(item['id'], item['quantity'])
        if q < 0 or q > item['maximum'] or q % item['multiple'] or (q and q < item['minimum']):
            raise HTTPException(422, f"{item['name']}: 주문 배수·최소·최대 수량을 확인해 주세요.")
        item['quantity'], item['cost'] = q, q * item['unit_cost']
    total = sum(i['cost'] for i in run['items'])
    if total > run['budget']:
        raise HTTPException(422, '발주 금액이 예산을 초과합니다.')
    with db() as con:
        cur = con.execute("UPDATE runs SET items=?,total=?,review=NULL,llm_usage=NULL WHERE id=? AND status='검토 중'",
            (json.dumps(run['items'], ensure_ascii=False), total, run_id))
        if cur.rowcount != 1:
            raise HTTPException(409, '확정 상태가 변경되었습니다.')
        con.execute('INSERT INTO events(run_id,action,created_at) VALUES(?,?,?)', (run_id, '수량 수정 및 예산 재검증', now()))
    return get_run(run_id)


@app.post('/api/runs/{run_id}/approve')
def approve(run_id: int):
    with db() as con:
        cur = con.execute("UPDATE runs SET status='확정' WHERE id=? AND status='검토 중'", (run_id,))
        if cur.rowcount != 1:
            raise HTTPException(409, '이미 확정했거나 존재하지 않는 발주서입니다.')
        con.execute('INSERT INTO events(run_id,action,created_at) VALUES(?,?,?)', (run_id, '발주 확정', now()))
    return get_run(run_id)


@app.post('/api/runs/{run_id}/review')
def review(run_id: int):
    run = get_run(run_id)
    if not LOCAL and not os.environ.get('OPENAI_API_KEY'):
        raise HTTPException(503, 'AI 검토에는 서버의 OPENAI_API_KEY 설정이 필요합니다.')
    started = time.perf_counter()
    instructions = ('편의점 점주에게 발주 검토 결과를 설명합니다. 입력에 있는 사실만 한국어 문장 3개로 요약하세요. '
            '제목과 마크다운은 쓰지 마세요. 수량·금액을 재계산하지 말고 그대로 복사하세요. '
            '주문 배수를 추정하지 마세요. 품절 위험, 소비기한 주의, 남은 예산을 각각 설명하세요. '
            '발주를 전송했다거나 실제로 비용을 절감했다고 말하지 마세요.')
    risks = [f"{i['name']} {i['quantity']}개" for i in run['items'] if i['risk'] == '품절 위험']
    expiry = [f"{i['name']} {i['quantity']}개" for i in run['items'] if i['risk'] == '소비기한 주의']
    reduced = [f"{i['name']} {i['desired']}→{i['quantity']}개" for i in run['items'] if i['quantity'] < i['desired']]
    facts = (f"발주 예산: {run['budget']:,}원\n발주 금액: {run['total']:,}원\n"
             f"남은 예산: {run['budget'] - run['total']:,}원\n"
             f"품절 위험 상품의 발주: {', '.join(risks) or '없음'}\n"
             f"소비기한 주의 상품의 발주: {', '.join(expiry) or '없음'}\n"
             f"예산 때문에 줄인 상품: {', '.join(reduced) or '없음'}\n"
            '공급업체로 전송한 주문은 아닙니다.')
    try:
        if LOCAL:
            model = os.environ.get('OPENAI_MODEL', 'mlx-community/Qwen3-1.7B-4bit')
            response = OpenAI(base_url=os.environ.get('LOCAL_AI_BASE_URL', 'http://127.0.0.1:8320/v1'),
                api_key='local', timeout=180, max_retries=0).chat.completions.create(model=model, max_tokens=500,
                temperature=0, messages=[{'role':'system','content':instructions},{'role':'user','content':facts}])
            explanation = response.choices[0].message.content or ''
            input_tokens, output_tokens = response.usage.prompt_tokens, response.usage.completion_tokens
        else:
            model = 'gpt-4o-mini'
            response = OpenAI(timeout=45, max_retries=1).responses.create(model=model, max_output_tokens=650,
                instructions=instructions, input=facts)
            explanation = response.output_text
            input_tokens, output_tokens = response.usage.input_tokens, response.usage.output_tokens
    except Exception as exc:
        raise HTTPException(502, f'AI 검토 요청 실패: {type(exc).__name__}') from None
    usage = {'input_tokens': input_tokens, 'output_tokens': output_tokens,
             'latency_ms': round((time.perf_counter() - started) * 1000), 'model': model,
             'provider': 'local' if LOCAL else 'openai'}
    with db() as con:
        cur = con.execute('UPDATE runs SET review=?,llm_usage=? WHERE id=? AND items=?',
          (explanation, json.dumps(usage), run_id, json.dumps(run['items'], ensure_ascii=False)))
        if cur.rowcount != 1:
            raise HTTPException(409, '검토 도중 수량이 변경되었습니다. 다시 검토해 주세요.')
        con.execute('INSERT INTO events(run_id,action,created_at) VALUES(?,?,?)', (run_id, 'AI 설명 생성', now()))
    return get_run(run_id)


@app.get('/api/runs/{run_id}/csv')
def export(run_id: int):
    run = get_run(run_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['품목코드', '상품명', '발주수량', '단가', '금액', '상태'])
    for item in run['items']:
        if item['quantity']:
            def safe_cell(value):
                return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) or value.startswith(('\t','\r','\n')) else value
            writer.writerow([safe_cell(item['id']), safe_cell(item['name']), item['quantity'], item['unit_cost'], item['cost'], run['status']])
    return Response('\ufeff' + output.getvalue(), media_type='text/csv; charset=utf-8',
                    headers={'Content-Disposition': f'attachment; filename="order-{run_id}.csv"'})


@app.get('/api/health')
def health():
    return {'status': 'ok', 'database': 'sqlite', 'provider': 'local' if LOCAL else 'openai',
            'api_configured': LOCAL or bool(os.environ.get('OPENAI_API_KEY'))}
