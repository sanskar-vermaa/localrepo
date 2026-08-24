import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test-inventory.sqlite');

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';

const { default: app } = await import('../src/app.js');
const { default: db } = await import('../src/db/index.js');

let server;
let baseUrl;
let token;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

beforeEach(async () => {
  db.exec('DELETE FROM stock_movements; DELETE FROM products; DELETE FROM users;');
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin', email: `a${Date.now()}${Math.random()}@x.com`, password: 'password1', role: 'admin' }),
  });
  token = (await res.json()).token;
});

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

test('adjustment cannot drive stock below zero', async () => {
  const productRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sku: 'INV-1', name: 'Widget', price: 10 }),
  });
  const product = await productRes.json();

  const res = await fetch(`${baseUrl}/api/inventory/movements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ product_id: product.id, type: 'ADJUSTMENT', quantity: -5 }),
  });
  assert.equal(res.status, 400);
});

test('low-stock endpoint returns products at or below reorder level', async () => {
  const productRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sku: 'INV-2', name: 'Low Stock Widget', price: 10, reorder_level: 5 }),
  });
  const product = await productRes.json();

  await fetch(`${baseUrl}/api/inventory/movements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ product_id: product.id, type: 'IN', quantity: 3 }),
  });

  const res = await fetch(`${baseUrl}/api/inventory/low-stock`, { headers: authHeaders() });
  const items = await res.json();
  assert.ok(items.some((p) => p.id === product.id));
});
