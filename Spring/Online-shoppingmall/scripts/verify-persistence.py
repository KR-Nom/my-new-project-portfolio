"""Verify real Spring HTTP order/cancel and H2 file persistence across process restart.
Run after ./gradlew bootJar. Creates and removes its own temporary H2 database.
JWT signing material is generated in memory and never printed or written.
"""
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8098'
JAR = ROOT / 'build/libs/skala-shop-api-0.0.1-SNAPSHOT.jar'
if not JAR.exists():
    jars = list((ROOT / 'build/libs').glob('*.jar'))
    JAR = next((p for p in jars if not p.name.endswith('-plain.jar')), JAR)
checks = []
process = None
log_file = None
env = os.environ.copy()
env['JWT_SECRET'] = secrets.token_hex(32)
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

def api(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': 'application/json'})
    try:
        response = opener.open(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, json.loads(response.read())

def check(name, condition):
    checks.append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)

def stop():
    global process, log_file
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    if log_file is not None:
        log_file.close()

with tempfile.TemporaryDirectory(prefix='shop-persistence-') as directory:
    env['SHOP_DB_URL'] = 'jdbc:h2:file:' + str(Path(directory) / 'shopdb') + ';DB_CLOSE_ON_EXIT=FALSE'
    def start():
        global process, log_file
        log_file = open(Path(directory) / 'server.log', 'ab')
        process = subprocess.Popen(['java', '-jar', str(JAR), '--spring.profiles.active=local', '--server.port=8098'], cwd=ROOT, env=env, stdout=log_file, stderr=log_file)
        for _ in range(120):
            if process.poll() is not None:
                raise RuntimeError('Spring process failed to start; inspect the isolated execution environment.')
            try:
                if api('/actuator/health')[0] == 200:
                    return
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.25)
        raise TimeoutError('Spring did not become ready')
    try:
        start()
        credentials = {'customerId': 'persistence-demo', 'customerPassword': 'test-only-password'}
        status, signup = api('/api/customers', credentials)
        check('Signup returns user without password', status == 200 and 'customerPassword' not in signup['body'])
        status, _ = api('/api/customers/login', credentials)
        check('Login issues HttpOnly cookie', status == 200 and any('HttpOnly' in c._rest for c in cookie_jar))
        status, order = api('/api/customers/order', {'productId': 1, 'quantity': 2})
        stock = api('/api/products/1')[1]['body']['stockQuantity']
        check('Order 2 units: points 970000 and stock 8', status == 200 and order['body']['customerPoint'] == 970000 and stock == 8)
        status, cancel = api('/api/customers/cancel', {'productId': 1, 'quantity': 1})
        stock = api('/api/products/1')[1]['body']['stockQuantity']
        check('Cancel 1 unit: points 985000 and stock 9', status == 200 and cancel['body']['customerPoint'] == 985000 and stock == 9)
        status, _ = api('/api/customers/order', {'productId': 1, 'quantity': 999})
        customer = api('/api/customers/persistence-demo')[1]['body']
        check('Rejected stock shortage leaves points and order unchanged', status == 400 and customer['customerPoint'] == 985000 and customer['products'][0]['quantity'] == 1)
        old_pid = process.pid
        stop()
        cookie_jar.clear()
        start()
        status, _ = api('/api/customers/login', credentials)
        customer = api('/api/customers/persistence-demo')[1]['body']
        stock = api('/api/products/1')[1]['body']['stockQuantity']
        check('Actual process restart preserves hashed login, order, points and stock', process.pid != old_pid and status == 200 and customer['customerPoint'] == 985000 and customer['products'][0]['quantity'] == 1 and stock == 9)
        products = api('/api/products?offset=0&count=50')[1]['body']['items']
        ranking = api('/api/products/rankings')[1]['body']
        check('Restart does not duplicate 13 seed products or reset net sales', len(products) == 13 and ranking[0]['totalSalesQuantity'] == 1)
    finally:
        stop()
        target = ROOT / 'report-assets/full-stack'
        target.mkdir(parents=True, exist_ok=True)
        report = {'executedAt': datetime.now(timezone.utc).isoformat(), 'runtime': 'Spring Boot 3.3 / Java 21 / H2 file local profile', 'kind': 'real HTTP and actual server process restart with isolated temporary database', 'passed': len(checks) == 7 and all(c['passed'] for c in checks), 'count': len(checks), 'checks': checks}
        (target / 'persistence-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(report, ensure_ascii=False))
