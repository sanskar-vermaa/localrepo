import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test-products.sqlite');

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
  db.exec('DELETE FROM products; DELETE FROM users;');
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

test('rejects duplicate SKUs', async () => {
  const payload = { sku: 'DUPE-1', name: 'Widget', price: 10 };
  const first = await fetch(`${baseUrl}/api/products`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/api/products`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  assert.equal(second.status, 409);
});

test('rejects negative price', async () => {
  const res = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sku: 'NEG-1', name: 'Bad Widget', price: -5 }),
  });
  assert.equal(res.status, 400);
});

test('search filters by name substring', async () => {
  await fetch(`${baseUrl}/api/products`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ sku: 'A-1', name: 'Blue Widget', price: 5 }) });
  await fetch(`${baseUrl}/api/products`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ sku: 'A-2', name: 'Red Gadget', price: 5 }) });

  const res = await fetch(`${baseUrl}/api/products?search=widget`, { headers: authHeaders() });
  const body = await res.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].name, 'Blue Widget');
});
