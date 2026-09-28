"""Integration checks use real Apple Vision, macOS Speech, WAV and SQLite."""
from io import BytesIO
from pathlib import Path
import sys
import tempfile
import unittest
import wave

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import create_app


class ToonVoicePipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="toonvoice-test-")
        cls.application = create_app(cls.temporary.name)
        cls.client = TestClient(cls.application)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.temporary.cleanup()

    def test_real_upload_ocr_edit_audio_export_and_sqlite_reopen(self):
        client = self.client
        created = client.post("/api/projects", json={"title": "한국어 OCR 통합 검사"})
        self.assertEqual(created.status_code, 201)
        project = created.json()
        path = f"/api/projects/{project['id']}"
        uploaded = client.post(path + "/image", files={"file": ("../../example.png", (ROOT / "assets/sample-ocr.png").read_bytes(), "image/png")})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        project = uploaded.json()
        result = client.post(path + "/ocr", json={"revision": project["revision"]})
        self.assertEqual(result.status_code, 200, result.text)
        project = result.json()
        recognized = " ".join(line["text"] for line in project["lines"])
        self.assertIn("비가", recognized)
        self.assertIn("천천히", recognized)
        self.assertGreaterEqual(len(project["lines"]), 2)
        self.assertTrue(all(line["confidence"] > 0 for line in project["lines"]))
        lines = [{"text": "비가 그쳤네. 조금만 더 걸을까?", "speaker": "서윤", "voice": "Yuna", "rate": 160},
                 {"text": "좋아. 오늘은 천천히 가자.", "speaker": "도윤", "voice": "Eddy (한국어(한국))", "rate": 175}]
        saved = client.put(path + "/lines", json={"revision": project["revision"], "lines": lines})
        self.assertEqual(saved.status_code, 200, saved.text)
        project = saved.json()
        generated = client.post(path + "/synthesize", json={"revision": project["revision"]})
        self.assertEqual(generated.status_code, 200, generated.text)
        project = generated.json()
        self.assertGreater(project["export_duration"], 1)
        for line in project["lines"]:
            self.assertGreater(line["duration"], 0)
            self.assertGreater(max(line["waveform"]), 0.01)
            self.assertEqual(client.get(line["audio_url"]).status_code, 200)
        exported = client.get(project["export_url"] + "?download=true")
        self.assertEqual(exported.status_code, 200)
        self.assertIn("attachment", exported.headers["content-disposition"])
        self.assertGreater(len(exported.content), 10_000)
        with wave.open(BytesIO(exported.content)) as audio:
            self.assertEqual(audio.getframerate(), 24000)
            self.assertEqual(audio.getnchannels(), 1)
            self.assertGreater(audio.getnframes(), 24000)
        with TestClient(create_app(self.temporary.name)) as reopened:
            persisted = reopened.get(path).json()
            self.assertEqual(persisted["lines"][0]["text"], lines[0]["text"])
            self.assertEqual(persisted["lines"][1]["speaker"], "도윤")
            self.assertEqual(persisted["export_url"], project["export_url"])
            self.assertEqual(reopened.get(persisted["export_url"]).content, exported.content)
        print(f"OCR regions={len(result.json()['lines'])}; WAV bytes={len(exported.content)}; duration={project['export_duration']}s; SQLite reopened=OK")

    def test_invalid_upload_conflict_and_cross_origin_are_rejected(self):
        client = self.client
        project = client.post("/api/projects", json={"title": "입력 검증"}).json()
        path = f"/api/projects/{project['id']}"
        self.assertEqual(client.post(path + "/image", files={"file": ("bad.png", b"not an image", "image/png")}).status_code, 422)
        self.assertEqual(client.get(path).json()["revision"], 0)
        self.assertEqual(client.post(path + "/synthesize", json={"revision": 0}).status_code, 422)
        line = {"text": "확인용 대사", "speaker": "인물", "voice": "Yuna", "rate": 170}
        self.assertEqual(client.put(path + "/lines", json={"revision": 0, "lines": [line]}).status_code, 200)
        self.assertEqual(client.put(path + "/lines", json={"revision": 0, "lines": [line]}).status_code, 409)
        self.assertEqual(client.put(path + "/lines", json={"revision": 1, "lines": [{**line, "voice": "Yuna; touch /tmp/unsafe"}]}).status_code, 422)
        self.assertEqual(client.post("/api/projects", headers={"Origin": "https://unrelated.example"}, json={"title": "blocked"}).status_code, 403)
        self.assertEqual(client.post(path + "/image", headers={"Content-Length": str(13 * 1024 * 1024)}).status_code, 413)


if __name__ == "__main__":
    unittest.main(verbosity=2)
