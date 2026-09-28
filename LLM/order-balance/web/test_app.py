import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


class OrderWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ['ORDER_STATE'] = self.tmp.name
        spec = importlib.util.spec_from_file_location('order_app', Path(__file__).with_name('app.py'))
        self.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.app)
        self.client = TestClient(self.app.app)

    def tearDown(self):
        self.tmp.cleanup()

    def test_budget_and_multiple_invariants_for_many_budgets(self):
        rows = self.app.inventory()
        for budget in [0, 1, 4999, 10000, 50000, 181560, 500000]:
            items = self.app.calculate(rows, budget)
            self.assertLessEqual(sum(i['cost'] for i in items), budget)
            for item in items:
                self.assertEqual(item['quantity'] % item['multiple'], 0)
                self.assertEqual(item['cost'], item['quantity'] * item['unit_cost'])
                self.assertLessEqual(item['quantity'], item['maximum'])

    def test_snapshot_reproduces_existing_candidate_total(self):
        run = self.client.post('/api/runs', json={'budget': 500000}).json()
        self.assertEqual(len(run['items']), 9)
        self.assertEqual(run['total'], 181560)

    def test_minimum_quantity_is_rounded_to_order_multiple(self):
        row = dict(self.app.inventory()[0])
        row.update(min_order_qty='15', max_order_qty='100', order_multiple_qty='10',
                   inventory_position_qty='0', avg_daily_quantity_long='1')
        item = self.app.calculate([row], 100000)[0]
        self.assertEqual(item['quantity'], 20)

    def test_csv_formula_prefix_is_escaped_for_code_and_name(self):
        run = self.client.post('/api/runs', json={'budget': 500000}).json()
        run['items'][0]['id'] = '=2+2'
        run['items'][0]['name'] = '\t=2+2'
        import json
        with self.app.db() as con:
            con.execute('UPDATE runs SET items=? WHERE id=?', (json.dumps(run['items']), run['id']))
        text = self.client.get(f"/api/runs/{run['id']}/csv").text
        self.assertIn("'=2+2", text)
        self.assertIn("'\t=2+2", text)

    def test_invalid_adjustment_does_not_change_database(self):
        run = self.client.post('/api/runs', json={'budget': 20000}).json()
        item = run['items'][0]
        r = self.client.patch(f"/api/runs/{run['id']}", json={'quantities': {item['id']: 1}})
        self.assertEqual(r.status_code, 422)
        r = self.client.patch(f"/api/runs/{run['id']}", json={'quantities': {item['id']: item['maximum']}})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(self.client.get(f"/api/runs/{run['id']}").json()['total'], run['total'])

    def test_approval_is_immutable_and_persistent(self):
        run = self.client.post('/api/runs', json={'budget': 500000}).json()
        route = f"/api/runs/{run['id']}"
        self.assertEqual(self.client.post(route + '/approve').status_code, 200)
        self.assertEqual(self.client.post(route + '/approve').status_code, 409)
        self.assertEqual(self.client.patch(route, json={'quantities': {}}).status_code, 409)
        # New SQLite connection reads the committed approval.
        with self.app.db() as con:
            self.assertEqual(con.execute('SELECT status FROM runs WHERE id=?', (run['id'],)).fetchone()[0], '확정')
        self.assertIn('불고기 삼각김밥', self.client.get(route + '/csv').text)

    def test_invalid_csv_is_atomic(self):
        before = self.client.get('/api/inventory').json()['count']
        r = self.client.post('/api/inventory', files={'file': ('bad.csv', b'item_id,item_name\nA,invalid')})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(self.client.get('/api/inventory').json()['count'], before)


if __name__ == '__main__':
    unittest.main(verbosity=2)
