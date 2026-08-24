import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test-auth.sqlite');

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';

const { default: app } = await import('../src/app.js');
const { default: db } = await import('../src/db/index.js');

let server;
let baseUrl;

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

beforeEach(() => {
  db.exec('DELETE FROM users;');
});

test('register rejects a short password', async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'a@x.com', password: '123' }),
  });
  assert.equal(res.status, 400);
});

test('register then login succeeds with matching credentials', async () => {
  const email = `user${Date.now()}@x.com`;
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User', email, password: 'password1' }),
  });
  assert.equal(registerRes.status, 201);

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password1' }),
  });
  assert.equal(loginRes.status, 200);
  const body = await loginRes.json();
  assert.ok(body.token);
});

test('login rejects wrong password', async () => {
  const email = `user${Date.now()}@x.com`;
  await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User', email, password: 'password1' }),
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrongpass' }),
  });
  assert.equal(loginRes.status, 401);
});

test('protected route rejects requests without a token', async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 401);
});
