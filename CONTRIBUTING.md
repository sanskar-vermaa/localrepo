# Contributing

## Local setup

1. `cd backend && npm install && npm run seed && npm run dev`
2. `cd frontend && npm install && npm run dev`
3. Sign in with `admin@stockflow.dev` / `admin123` (from the seed script).

## Running tests

```bash
cd backend
npm test
```

Tests use Node's built-in test runner (`node --test`) against a throwaway
SQLite file per test suite — no external database or mocking required.

## Code style

- Plain JavaScript (ES modules), no build step for the backend.
- Keep route handlers thin; put multi-step writes inside a
  `db.transaction(...)` so partial failures can't corrupt stock counts.
- Prefer small, focused commits over large mixed ones.
