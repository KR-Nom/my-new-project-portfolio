'''장현진 · 2026-09-28. 질문 저장/권한/재시도/근거/AI 오류의 통합 테스트.
실행: python -m unittest discover -s tests -v
'''
import json
from pathlib import Path
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from uuid import uuid4

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app import ROOT, QuestionInput, create_app, database, generate_answer, select_context


class HonbotTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.db = Path(self.directory.name)/'questions.sqlite3'
        self.app = create_app(self.db, ai_mode='transcript')
        self.client = TestClient(self.app)
        self.client.__enter__()
        self.client.get('/api/health')
        self.route = '/api/lectures/calculus-basics'

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.directory.cleanup()

    def ask(self, **overrides):
        payload = {'question':'x=2에서 미분계수는 왜 4인가요?', 'timestamp':33, 'request_id':uuid4().hex}
        payload.update(overrides)
        return self.client.post(self.route+'/questions', json=payload)

    def test_question_sources_saved_feedback_and_review(self):
        response = self.ask()
        self.assertEqual(response.status_code, 200)
        item = response.json()
        self.assertEqual(item['provider'],'transcript')
        self.assertIn('AI 생성 답변은 아닙니다',item['answer'])
        self.assertIn('derivative',[source['id'] for source in item['citations']])
        q = f'/api/questions/{item["id"]}'
        self.assertEqual(self.client.post(q+'/bookmark',json={'bookmarked':True}).status_code,200)
        self.client.post(q+'/feedback',json={'rating':'unclear','comment':'접선을 더 설명해 주세요.'})
        review = self.client.get(self.route+'/review').json()
        self.assertEqual(len(review),1)
        self.assertEqual(review[0]['feedback']['comment'],'접선을 더 설명해 주세요.')
        stats = self.client.get(self.route+'/insights').json()
        self.assertEqual((stats['question_count'],stats['unclear_count'],stats['bookmarked_count']),(1,1,1))
        self.client.post(q+'/bookmark',json={'bookmarked':False})
        self.client.post(q+'/feedback',json={'rating':'understood'})
        self.assertEqual(self.client.get(self.route+'/review').json(),[])

    def test_idempotency_does_not_duplicate_answer(self):
        request_id = uuid4().hex
        first = self.ask(request_id=request_id).json()
        second = self.ask(request_id=request_id).json()
        self.assertEqual(first['id'],second['id'])
        self.assertEqual(len(self.client.get(self.route+'/questions').json()),1)
        self.assertEqual(self.ask(request_id=request_id,question='다른 질문').status_code,409)

    def test_invalid_questions_are_not_saved(self):
        for fields in ({'question':'  '},{'timestamp':-1},{'timestamp':61},{'request_id':'bad'},{'question':'x'*2001}):
            with self.subTest(fields=fields):
                self.assertEqual(self.ask(**fields).status_code,422)
        self.assertEqual(self.client.get(self.route+'/questions').json(),[])
        self.assertEqual(self.client.get('/api/lectures/missing').status_code,404)

    def test_inflight_duplicate_only_calls_model_once(self):
        started, release = threading.Event(), threading.Event()
        calls = []
        def provider(*args):
            calls.append(1)
            started.set()
            release.wait(5)
            return {'answer':'검증 답변', 'provider':'test', 'model':'test-model'}
        with TestClient(create_app(Path(self.directory.name)/'concurrent.sqlite3',ai_mode='openai_compatible',answerer=provider)) as client:
            client.get('/api/health')
            payload={'question':'기울기?', 'timestamp':30, 'request_id':uuid4().hex}
            with ThreadPoolExecutor(max_workers=1) as executor:
                pending=executor.submit(client.post,self.route+'/questions',json=payload)
                try:
                    self.assertTrue(started.wait(3))
                    self.assertEqual(client.post(self.route+'/questions',json=payload).status_code,409)
                finally:
                    release.set()
                self.assertEqual(pending.result(timeout=5).status_code,200)
            self.assertEqual(len(calls),1)
            self.assertEqual(len(client.get(self.route+'/questions').json()),1)

    def test_other_browser_cannot_access_or_mutate_questions(self):
        first = self.ask().json()
        other = TestClient(self.app)
        self.assertEqual(other.get(self.route+'/questions').json(),[])
        self.assertEqual(other.post(f'/api/questions/{first["id"]}/bookmark',json={'bookmarked':True}).status_code,404)
        self.assertEqual(other.post(f'/api/questions/{first["id"]}/feedback',json={'rating':'understood'}).status_code,404)
        payload = {'question':'같은 질문','timestamp':30,'request_id':uuid4().hex,'parent_question_id':first['id']}
        self.assertEqual(other.post(self.route+'/questions',json=payload).status_code,404)
        self.assertEqual(other.get(self.route+'/export').json()['questions'],[])
        other.close()

    def test_restart_preserves_history_and_secure_cookie(self):
        answer = self.ask().json()
        cookie = self.client.cookies.get('honbot_session')
        with TestClient(create_app(self.db,ai_mode='transcript')) as restarted:
            restarted.cookies.set('honbot_session',cookie)
            self.assertEqual(restarted.get(self.route+'/questions').json()[0]['id'],answer['id'])
        visitor = TestClient(self.app)
        response = visitor.get('/api/health')
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        self.assertIn('SameSite=strict',response.headers['set-cookie'])
        self.assertEqual(response.headers['cache-control'],'no-store')
        visitor.close()

    def test_provider_failure_retries_same_id_without_fake_answer(self):
        calls=[]
        def provider(settings,payload,lecture,citations,history):
            calls.append(history)
            if len(calls)==1:
                raise HTTPException(504,'AI 연결 시간 초과')
            return {'answer':'도함수 2x에 2를 대입하면 4입니다. [30초]','provider':'openai_compatible','model':'test-model'}
        with TestClient(create_app(Path(self.directory.name)/'retry.sqlite3',ai_mode='openai_compatible',answerer=provider)) as client:
            payload={'question':'미분계수는?','timestamp':30,'request_id':uuid4().hex}
            self.assertEqual(client.post(self.route+'/questions',json=payload).status_code,504)
            self.assertEqual(client.get(self.route+'/questions').json(),[])
            success=client.post(self.route+'/questions',json=payload)
            self.assertEqual(success.status_code,200)
            self.assertEqual(success.json()['provider'],'openai_compatible')
            self.assertEqual(client.post(self.route+'/questions',json=payload).json()['id'],success.json()['id'])
            self.assertEqual(len(calls),2)
            payload.update(request_id=uuid4().hex,parent_question_id=success.json()['id'],question='다시 설명해 주세요')
            self.assertEqual(client.post(self.route+'/questions',json=payload).status_code,200)
            self.assertEqual([m['role'] for m in calls[-1]],['user','assistant'])

    def test_interrupted_request_recovered_on_start(self):
        answer=self.ask().json()
        with database(self.db) as db:
            db.execute("UPDATE questions SET status='pending' WHERE id=?",(answer['id'],))
        with TestClient(create_app(self.db,ai_mode='transcript')):
            with database(self.db) as db:
                row=db.execute('SELECT status,error_code FROM questions WHERE id=?',(answer['id'],)).fetchone()
                self.assertEqual(tuple(row),('failed','interrupted'))

    def test_context_uses_current_segment_at_boundaries(self):
        lecture=json.loads((ROOT/'content/lectures.json').read_text())[0]
        for timestamp, expected in ((0,'average'),(15,'instant'),(30,'derivative'),(60,'tangent')):
            with self.subTest(timestamp=timestamp):
                self.assertIn(expected,[s['id'] for s in select_context(lecture,timestamp,'접선')])
        self.assertEqual(self.ask(timestamp=60).status_code,200)
        self.assertEqual(self.client.get(self.route+'/insights').json()['topics'][-1]['count'],1)

    def test_bad_provider_response_and_timeout_are_controlled_errors(self):
        settings={'ai_mode':'openai_compatible','base_url':'http://provider.invalid/v1','model':'test','timeout':1,'api_key':'test-private-value'}
        lecture=json.loads((ROOT/'content/lectures.json').read_text())[0]
        payload=QuestionInput(question='기울기?',timestamp=30,request_id='test-request')
        with patch('app.httpx.Client') as constructor:
            client=constructor.return_value.__enter__.return_value
            client.post.side_effect=httpx.ReadTimeout('internal sensitive response')
            with self.assertRaises(HTTPException) as failure:
                generate_answer(settings,payload,lecture,[],[])
            self.assertEqual(failure.exception.status_code,504)
            self.assertNotIn('sensitive',failure.exception.detail)
            client.post.side_effect=None
            client.post.return_value.json.return_value={'choices':[]}
            with self.assertRaises(HTTPException) as invalid:
                generate_answer(settings,payload,lecture,[],[])
            self.assertEqual(invalid.exception.status_code,502)
            self.assertNotIn('test-private-value',invalid.exception.detail)

    def test_media_files_and_range_requests(self):
        for path in ('/','/media/calculus.vtt','/media/poster.png'):
            self.assertEqual(self.client.get(path).status_code,200)
        response=self.client.get('/media/calculus.mp4',headers={'Range':'bytes=0-99'})
        self.assertEqual(response.status_code,206)
        self.assertEqual(len(response.content),100)


if __name__=='__main__':
    unittest.main()
