import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test.sqlite');

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
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  for (const suffix of ['-wal', '-shm']) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

beforeEach(async () => {
  db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM stock_movements; DELETE FROM products; DELETE FROM users;');

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tester', email: `t${Date.now()}@x.com`, password: 'password1', role: 'admin' }),
  });
  const body = await res.json();
  token = body.token;
});

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function createProduct(overrides = {}) {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sku: `SKU-${Date.now()}-${Math.random()}`, name: 'Test Widget', price: 100, cost: 50, ...overrides }),
  });
  return res.json();
}

test('order creation decrements product stock', async () => {
  const product = await createProduct();
  await fetch(`${baseUrl}/api/inventory/movements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ product_id: product.id, type: 'IN', quantity: 10 }),
  });

  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items: [{ product_id: product.id, quantity: 3 }] }),
  });
  assert.equal(orderRes.status, 201);

  const productRes = await fetch(`${baseUrl}/api/products/${product.id}`, { headers: authHeaders() });
  const updated = await productRes.json();
  assert.equal(updated.quantity, 7);
});

test('order creation rejects insufficient stock', async () => {
  const product = await createProduct();
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items: [{ product_id: product.id, quantity: 1 }] }),
  });
  assert.equal(orderRes.status, 400);
});

test('cancelling an order restores stock', async () => {
  const product = await createProduct();
  await fetch(`${baseUrl}/api/inventory/movements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ product_id: product.id, type: 'IN', quantity: 5 }),
  });

  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items: [{ product_id: product.id, quantity: 5 }] }),
  });
  const order = await orderRes.json();

  await fetch(`${baseUrl}/api/orders/${order.id}/cancel`, { method: 'POST', headers: authHeaders() });

  const productRes = await fetch(`${baseUrl}/api/products/${product.id}`, { headers: authHeaders() });
  const updated = await productRes.json();
  assert.equal(updated.quantity, 5);
});
