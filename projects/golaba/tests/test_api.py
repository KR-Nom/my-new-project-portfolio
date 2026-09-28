'''장현진 · 2026-09-28 · 임시 SQLite 기반 GOLABA API·큐 통합 검사.'''
import importlib.util
import tempfile
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location('golaba_app', Path(__file__).resolve().parents[1] / 'app.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
TOKEN = 'test-reviewer-token-2026-only'


class GolabaTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / 'golaba.sqlite3'
        self.app = module.create_app(self.database, reviewer_token=TOKEN, start_worker=False)
        self.client = TestClient(self.app)
        self.client.__enter__()
        self.client.get('/api/session')

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def payload(self, complete=True):
        return {'project_id':'living-2026', 'applicant_name':'예시 지원자',
                'purpose':'청년 생활 계획을 수립하고 학습 활동을 지속하기 위해 예시 지원을 신청합니다.',
                'documents': {'eligibility':'합성 지원 자격 확인서입니다. 개인정보와 실제 발급 문서를 포함하지 않습니다.',
                              'plan':'생활 계획을 수립하고 월별 학습 목표와 예산 계획을 점검할 예정입니다.'} if complete else {}}

    def submit(self, complete=True):
        response = self.client.post('/api/applications', json=self.payload(complete))
        self.assertEqual(response.status_code, 202, response.text)
        return response.json()['id']

    def staff(self):
        response = self.client.post('/api/reviewer/session', json={'token':TOKEN})
        self.assertEqual(response.status_code, 200, response.text)

    def test_queue_then_missing_documents_supplement_and_approval(self):
        identifier = self.submit(False)
        self.assertEqual(self.client.get('/api/applications/'+identifier).json()['status'], 'CHECKING')
        self.app.state.process_one()
        checked = self.client.get('/api/applications/'+identifier).json()
        self.assertEqual(checked['status'], 'NEEDS_SUPPLEMENT')
        self.assertEqual(len(checked['checks']), 2)
        self.staff()
        decision = {'decision':'APPROVED','reason':'제출 서류 확인 완료','revision':1}
        self.assertEqual(self.client.post(f'/api/reviewer/applications/{identifier}/decision',json=decision).status_code,409)
        self.assertEqual(self.client.put('/api/applications/'+identifier,json=self.payload()).status_code,202)
        self.app.state.process_one()
        decision['revision'] = 2
        self.assertEqual(self.client.post(f'/api/reviewer/applications/{identifier}/decision',json=decision).status_code,200)
        saved = self.client.get('/api/applications/'+identifier).json()
        self.assertEqual(saved['status'],'APPROVED')
        self.assertEqual(len(saved['events']),5)
        self.assertEqual(self.client.put('/api/applications/'+identifier,json=self.payload()).status_code,409)

    def test_another_browser_cannot_read_or_change_application(self):
        identifier = self.submit()
        with TestClient(self.app) as outsider:
            outsider.get('/api/session')
            self.assertEqual(outsider.get('/api/applications').json(),[])
            self.assertEqual(outsider.get('/api/applications/'+identifier).status_code,404)
            self.assertEqual(outsider.put('/api/applications/'+identifier,json=self.payload()).status_code,404)
            self.assertEqual(outsider.get('/api/reviewer/applications').status_code,403)
            self.assertEqual(outsider.post(f'/api/reviewer/applications/{identifier}/decision',json={'decision':'APPROVED','reason':'검토 완료했습니다.','revision':1}).status_code,403)

    def test_duplicate_submission_and_two_workers_commit_once(self):
        identifier = self.submit()
        self.assertEqual(self.client.post('/api/applications',json=self.payload()).status_code,409)
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _:self.app.state.process_one(),range(2)))
        self.assertFalse(self.app.state.process_one())
        with self.app.state.connect() as con:
            self.assertEqual(con.execute('SELECT COUNT(*) FROM jobs').fetchone()[0],1)
            self.assertEqual(con.execute("SELECT COUNT(*) FROM events WHERE action='PRECHECK_COMPLETED'").fetchone()[0],1)
        self.assertEqual(self.client.get('/api/applications/'+identifier).json()['status'],'READY')

    def test_expired_worker_lease_and_restart_recover_durable_job(self):
        identifier = self.submit()
        with self.app.state.connect() as con:
            con.execute("UPDATE jobs SET state='RUNNING',claim='old-worker',lease_until=?,attempts=1",(time.time()-10,))
        restarted = module.create_app(self.database, reviewer_token=TOKEN,start_worker=False)
        with TestClient(restarted):
            restarted.state.process_one()
        self.assertEqual(self.client.get('/api/applications/'+identifier).json()['status'],'READY')
        with self.app.state.connect() as con:
            saved = con.execute('SELECT state,attempts FROM jobs').fetchone()
            self.assertEqual((saved['state'],saved['attempts']),('DONE',2))

    def test_reviewer_authentication_logout_and_stale_revision(self):
        identifier=self.submit()
        self.app.state.process_one()
        self.assertEqual(self.client.post('/api/reviewer/session',json={'token':'wrong-token-at-least-16'}).status_code,403)
        self.staff()
        self.assertEqual(len(self.client.get('/api/reviewer/applications').json()),1)
        self.assertEqual(self.client.post(f'/api/reviewer/applications/{identifier}/decision',json={'decision':'APPROVED','reason':'문서 내용을 확인했습니다.','revision':2}).status_code,409)
        self.client.delete('/api/reviewer/session')
        self.assertEqual(self.client.get('/api/reviewer/applications').status_code,403)

    def test_unexpected_fields_invalid_text_and_cross_origin_rejected(self):
        invalid=self.payload(); invalid['owner']='spoofed'
        self.assertEqual(self.client.post('/api/applications',json=invalid).status_code,422)
        invalid=self.payload(); invalid['purpose']='짧음'
        self.assertEqual(self.client.post('/api/applications',json=invalid).status_code,422)
        invalid=self.payload(); invalid['documents']['arbitrary']='unknown'
        self.assertEqual(self.client.post('/api/applications',json=invalid).status_code,422)
        self.assertEqual(self.client.post('/api/applications',json=self.payload(),headers={'Origin':'https://example.net'}).status_code,403)
        self.assertEqual(self.client.get('/api/applications').json(),[])

    def test_no_reviewer_configuration_does_not_grant_access(self):
        application=module.create_app(Path(self.temp.name)/'no-token.sqlite3',reviewer_token='',start_worker=False)
        with TestClient(application) as client:
            self.assertFalse(client.get('/api/session').json()['reviewer_configured'])
            self.assertEqual(client.post('/api/reviewer/session',json={'token':TOKEN}).status_code,503)
            self.assertEqual(client.get('/api/reviewer/applications').status_code,403)

    def test_background_worker_processes_saved_job_without_manual_trigger(self):
        application=module.create_app(Path(self.temp.name)/'background.sqlite3',reviewer_token=TOKEN,start_worker=True)
        with TestClient(application) as client:
            client.get('/api/session')
            identifier=client.post('/api/applications',json=self.payload()).json()['id']
            deadline=time.monotonic()+3
            while time.monotonic()<deadline:
                saved=client.get('/api/applications/'+identifier).json()
                if saved['status']=='READY':break
                time.sleep(.1)
            self.assertEqual(saved['status'],'READY')


if __name__=='__main__':
    unittest.main()
