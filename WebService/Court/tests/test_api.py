"""실행: python -m unittest discover -s tests -v. 테스트 DB는 임시 디렉터리만 사용."""
import importlib
import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient


class CourtCastTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        os.environ["COURTCAST_DB"] = self.folder.name + "/test.sqlite3"
        from backend import app
        self.module = importlib.reload(app)
        self.client = TestClient(self.module.app)
        self.client.__enter__()
        self.court = self.client.get("/api/courts").json()["items"][0]
        self.court_url = "/api/courts/" + self.court["id"]

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.folder.cleanup()
        os.environ.pop("COURTCAST_DB", None)

    def test_real_seed_and_filtered_query(self):
        health = self.client.get("/api/health").json()
        self.assertEqual((health["courts"], health["reservation_services"]), (36, 336))
        rows = self.client.get("/api/courts", params={"district": "마포구"}).json()["items"]
        self.assertTrue(rows)
        self.assertTrue(all(row["district"] == "마포구" for row in rows))
        self.assertEqual(self.client.get("/api/courts", params={"q": "없는코트123"}).json()["count"], 0)

    def test_report_roundtrip_persistence_and_owner_deletion(self):
        response = self.client.post(self.court_url + "/reports", json={"condition": "wet", "note": "검수용 제보", "is_demo": True})
        self.assertEqual(response.status_code, 201)
        report_id = response.json()["id"]
        self.module.initialize()
        reports = self.client.get(self.court_url + "/reports").json()["items"]
        self.assertEqual(reports[0]["note"], "검수용 제보")
        self.assertTrue(reports[0]["is_demo"])
        self.assertTrue(reports[0]["is_mine"])
        with TestClient(self.module.app) as stranger:
            self.assertEqual(stranger.delete("/api/reports/" + str(report_id)).status_code, 404)
        self.assertEqual(self.client.delete("/api/reports/" + str(report_id)).status_code, 200)
        self.assertEqual(self.client.get(self.court_url + "/reports").json()["items"], [])

    def test_favorites_are_idempotent_and_session_isolated(self):
        route = "/api/favorites/" + self.court["id"]
        self.client.post(route)
        self.client.post(route)
        self.assertEqual(self.client.get("/api/courts?favorites=true").json()["count"], 1)
        with TestClient(self.module.app) as other:
            self.assertEqual(other.get("/api/courts?favorites=true").json()["count"], 0)
        self.client.delete(route)
        self.assertEqual(self.client.get("/api/courts?favorites=true").json()["count"], 0)

    def test_invalid_inputs_and_cross_origin_write_are_rejected(self):
        self.assertEqual(self.client.post(self.court_url + "/reports", json={"condition": "invented"}).status_code, 422)
        self.assertEqual(self.client.post(self.court_url + "/reports", json={"condition": "wet", "note": "x" * 201}).status_code, 422)
        self.assertEqual(self.client.post("/api/courts/missing/reports", json={"condition": "wet"}).status_code, 404)
        self.assertEqual(self.client.post(self.court_url + "/reports", headers={"Origin": "https://other.example"}, json={"condition": "wet"}).status_code, 403)
        self.assertEqual(self.client.get("/api/courts", params={"q": "x" * 81}).status_code, 422)

    def test_weather_live_then_ttl_cache_then_stale_on_failure(self):
        fixture = {"current": {"time": "2026-09-28T10:15", "temperature_2m": 20.1}, "hourly": {"time": []}}
        with patch.object(self.module, "urlopen", return_value=io.BytesIO(json.dumps(fixture).encode())) as fetch:
            first = self.client.get(self.court_url + "/weather").json()
            second = self.client.get(self.court_url + "/weather").json()
            self.assertEqual((first["mode"], second["mode"]), ("live", "cache"))
            self.assertEqual(fetch.call_count, 1)
        with self.module.connection() as db:
            db.execute("UPDATE weather_cache SET fetched_at='2020-01-01T00:00:00+00:00'")
        with patch.object(self.module, "urlopen", side_effect=OSError("offline")):
            response = self.client.get(self.court_url + "/weather")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["mode"], "stale")

    def test_weather_without_cache_returns_explicit_unavailable(self):
        with patch.object(self.module, "urlopen", side_effect=OSError("offline")):
            self.assertEqual(self.client.get(self.court_url + "/weather").status_code, 503)

    def test_original_reservation_services_remain_distinct(self):
        detail = self.client.get(self.court_url).json()
        self.assertEqual(set(row["id"] for row in detail["services"]), set(detail["service_ids"]))
        self.assertTrue(all(row["url"].startswith("https://yeyak.seoul.go.kr/") for row in detail["services"]))


if __name__ == "__main__":
    unittest.main()
