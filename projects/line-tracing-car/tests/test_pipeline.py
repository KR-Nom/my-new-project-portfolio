'''
작성: 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28
변경: 저장/조회 흐름, 잘못된 입력, 경로 이탈, 검증 데이터 누출 회귀 테스트
실행: python -m unittest discover -s tests -v
'''
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from app import ROOT, create_app
from dataset import read_archive, session_split, validate_csv
from train import load_training_frames


def archive_with_csv(csv_text):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("frames.csv", csv_text)
        archive.writestr("images/frame.jpg", (ROOT / "sample-data/images/1720_cam-image_array_.jpg").read_bytes())
    return output.getvalue()


class DatasetTests(unittest.TestCase):
    def test_public_sample_matches_exact_record_and_sorts_time(self):
        frames = validate_csv((ROOT / "sample-data/frames.csv").read_bytes(),
                              lambda name: (ROOT / "sample-data" / name).read_bytes())
        self.assertEqual([frame["timestamp_ms"] for frame in frames], [83579, 206800, 327878])
        self.assertEqual(frames[2]["steering"], -0.6245307779168066)
        self.assertEqual(frames[0]["sha256"], "2b1c49b9157386f5be710a6cbbf52e28aa218f65d2601b06785e1e955cad4c60")

    def test_invalid_commands_and_paths_fail_before_storage(self):
        for filename, steer, throttle in [("../secret.jpg", "0", "1"), ("/tmp/x.jpg", "0", "1"),
                                           ("images/frame.jpg", "NaN", "1"), ("images/frame.jpg", "0", "1.1")]:
            with self.subTest(filename=filename, steer=steer, throttle=throttle):
                content = archive_with_csv(f"filename,timestamp_ms,steering,throttle\n{filename},1000,{steer},{throttle}\n")
                with self.assertRaises(ValueError):
                    read_archive(content)

    def test_missing_image_duplicate_timestamp_and_empty_csv_fail(self):
        header = "filename,timestamp_ms,steering,throttle\n"
        for text in [header, header + "missing.jpg,0,0,0\n",
                     header + "images/frame.jpg,1,0,0\nimages/frame.jpg,1,0,0\n"]:
            with self.subTest(csv=text), self.assertRaises(ValueError):
                read_archive(archive_with_csv(text))

    def test_corrupted_image_and_non_zip_fail(self):
        with self.assertRaises(ValueError):
            read_archive(b"not-a-zip")
        with self.assertRaises(ValueError):
            validate_csv(b"filename,timestamp_ms,steering,throttle\nx.jpg,0,0,0\n", lambda name: b"bad-image")

    def test_session_split_prevents_frame_leakage(self):
        frames = [{"session_id": "a", "sha256": "same"}, {"session_id": "b", "sha256": "same"}]
        with self.assertRaisesRegex(ValueError, "같은 이미지"):
            session_split(frames, ["b"])
        frames[1]["sha256"] = "different"
        train, validation = session_split(frames, ["b"])
        self.assertEqual([frame["session_id"] for frame in train], ["a"])
        self.assertEqual([frame["session_id"] for frame in validation], ["b"])
        with self.assertRaises(ValueError):
            session_split(frames, ["a", "b"])


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.client = TestClient(create_app(Path(self.temp.name)))
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.temp.cleanup()

    def test_demo_to_image_and_csv_is_a_real_database_flow(self):
        self.assertEqual(self.client.get("/api/health").json()["frames"], 3)
        session = self.client.get("/api/sessions/public-demo").json()
        image = self.client.get(session["frames"][0]["image_url"])
        self.assertEqual(image.status_code, 200)
        self.assertTrue(image.headers["content-type"].startswith("image/"))
        self.assertEqual(self.client.get("/api/sessions/public-demo/csv").text.count("\n"), 4)

    def test_upload_persists_and_invalid_archive_leaves_database_unchanged(self):
        content = archive_with_csv("filename,timestamp_ms,steering,throttle\nimages/frame.jpg,1,0.2,0.4\n")
        result = self.client.post("/api/sessions?name=My%20run", content=content)
        self.assertEqual(result.status_code, 201, result.text)
        session = self.client.get("/api/sessions/" + result.json()["id"]).json()
        self.assertEqual(session["frames"][0]["steering"], 0.2)
        invalid = self.client.post("/api/sessions?name=bad", content=b"bad")
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(self.client.get("/api/health").json()["frames"], 4)
        self.assertEqual(len(self.client.get("/api/sessions").json()), 2)

    def test_demo_is_not_silently_used_as_a_trained_model(self):
        with self.assertRaises(ValueError):
            load_training_frames(Path(self.temp.name), ["public-demo"])
        self.assertFalse(self.client.get("/api/health").json()["hardware_connected"])

    def test_unknown_ids_and_blank_name_are_rejected(self):
        self.assertEqual(self.client.get("/api/sessions/no-such-id").status_code, 404)
        self.assertEqual(self.client.get("/api/frames/no-such-id/image").status_code, 404)
        self.assertEqual(self.client.post("/api/sessions?name=%20", content=b"").status_code, 422)

    def test_seed_is_idempotent_across_restart(self):
        self.client.__exit__(None, None, None)
        self.client = TestClient(create_app(Path(self.temp.name)))
        self.client.__enter__()
        self.assertEqual(self.client.get("/api/health").json()["frames"], 3)


if __name__ == "__main__":
    unittest.main()
