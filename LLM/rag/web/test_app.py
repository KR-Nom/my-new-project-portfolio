import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class DocumentValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ['DOCLENS_STATE'] = self.tmp.name
        spec = importlib.util.spec_from_file_location('doclens_app', Path(__file__).with_name('app.py'))
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.client = TestClient(self.module.app)

    def tearDown(self):
        self.tmp.cleanup()

    def test_non_pdf_does_not_enter_database(self):
        r = self.client.post('/api/documents', files={'file': ('fake.pdf', b'not a PDF')})
        self.assertEqual(r.status_code, 415)
        self.assertEqual(self.client.get('/api/documents').json(), [])

    def test_missing_document_cannot_generate_answer(self):
        r = self.client.post('/api/documents/999/questions', json={'question': 'What is this document?'})
        self.assertEqual(r.status_code, 404)

    def test_chunking_keeps_page_and_overlap(self):
        text = ''.join(str(i % 10) for i in range(3000))
        chunks = self.module.split_pages([(7, text)])
        self.assertEqual({p for p, _ in chunks}, {7})
        self.assertEqual(chunks[0][1][-180:], chunks[1][1][:180])
        self.assertEqual(chunks[-1][1][-100:], text[-100:])

    def test_corrupt_pdf_rejected(self):
        r = self.client.post('/api/documents', files={'file': ('broken.pdf', b'%PDF-1.7\ninvalid')})
        self.assertEqual(r.status_code, 422)


if __name__ == '__main__':
    unittest.main(verbosity=2)
