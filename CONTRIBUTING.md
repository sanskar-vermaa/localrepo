# Contributing

## Setup

1. `cd backend && npm install && npm run seed && npm run dev`
2. `cd frontend && npm install && npm run dev`
3. Log in with `admin@stockflow.dev` / `admin123` (seed script creates this).

## Tests

```bash
cd backend
npm test
```

## Style notes

- Plain JS, ES modules, no build step on the backend.
- Keep route handlers thin. Anything that touches stock + more than one
  table (orders, mostly) goes through `db.transaction(...)` so a failure
  partway through can't leave stock counts wrong.
- Small commits over big mixed ones, please.
