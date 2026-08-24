import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test-categories.sqlite');

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';

const { default: app } = await import('../src/app.js');
const { default: db } = await import('../src/db/index.js');

let server;
let baseUrl;
let adminToken;
let staffToken;

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
  db.exec('DELETE FROM categories; DELETE FROM users;');

  const adminRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin', email: `admin${Date.now()}${Math.random()}@x.com`, password: 'password1', role: 'admin' }),
  });
  adminToken = (await adminRes.json()).token;

  const staffRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Staff', email: `staff${Date.now()}${Math.random()}@x.com`, password: 'password1', role: 'staff' }),
  });
  staffToken = (await staffRes.json()).token;
});

test('staff cannot create a category', async () => {
  const res = await fetch(`${baseUrl}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ name: 'Electronics' }),
  });
  assert.equal(res.status, 403);
});

test('admin can create and staff can read', async () => {
  const createRes = await fetch(`${baseUrl}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Electronics' }),
  });
  assert.equal(createRes.status, 201);

  const listRes = await fetch(`${baseUrl}/api/categories`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const items = await listRes.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Electronics');
});

test('rejects duplicate category names', async () => {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
  await fetch(`${baseUrl}/api/categories`, { method: 'POST', headers, body: JSON.stringify({ name: 'Stationery' }) });
  const res = await fetch(`${baseUrl}/api/categories`, { method: 'POST', headers, body: JSON.stringify({ name: 'Stationery' }) });
  assert.equal(res.status, 409);
});
