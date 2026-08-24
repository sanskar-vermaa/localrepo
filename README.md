# StockFlow

A small inventory + order management app. I built this after getting tired
of tracking stock in a spreadsheet for a side project — once you have
concurrent sales, restocks, and the occasional cancelled order, a
spreadsheet just can't keep up. StockFlow keeps one source of truth
(SQLite) and logs every stock change as a movement (`IN` / `OUT` /
`ADJUSTMENT`) so you can always answer "why is this number what it is".

Plain JS end to end — Express + better-sqlite3 on the backend, React
(Vite) on the frontend. No TypeScript, no build step you have to think
about.

## What it does

- Login/register with two roles, `admin` and `staff` (JWT-based).
- Product catalog — SKUs, categories, price/cost, reorder levels.
- Restock and manual stock adjustments, with a full movement history per
  product for auditing.
- Orders: pick products into a cart, place the order, stock gets
  decremented and the sale recorded in one transaction. Cancelling an
  order restores the stock.
- Low-stock alerts, sales summary by date range, top-selling products.
- Search + pagination on the products/customers lists.

## Running it locally

Backend first:

```bash
cd backend
npm install
npm run seed   # creates an admin user + some demo products
npm run dev
```

That listens on `localhost:4000`. Copy `backend/.env.example` to `.env`
if you want a different port or JWT secret.

Then the frontend, in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Opens on `localhost:5173`, proxies `/api` calls to the backend. Log in
with `admin@stockflow.dev` / `admin123` (from the seed script).

## Tests

```bash
cd backend
npm test
```

15 tests using node's built-in test runner — no jest, no mocking the
database. Each file boots the real Express app on a random port against
a throwaway SQLite file and hits it with plain `fetch`. Covers auth,
product validation, the stock-adjustment guard, and the order
creation/cancellation transaction logic (that last one's the part I was
most worried about getting wrong).

## Project layout

```
backend/src/
  db/          schema.sql + the sqlite connection
  middleware/  auth (jwt) + error handling
  routes/      auth, products, categories, customers, inventory, orders, reports
  seed.js
  server.js

frontend/src/
  api/         axios client
  context/     auth context
  components/  layout, protected route
  pages/       one file per screen
```

## API, roughly

Auth: `POST /api/auth/register`, `POST /api/auth/login`.

Everything else needs a bearer token. Products, categories, and
customers are standard REST (`GET/POST/PUT/DELETE` on
`/api/<resource>` and `/api/<resource>/:id`). Products support
`?search=&category_id=&low_stock=true&page=&pageSize=`.

Inventory: `POST /api/inventory/movements` (restock or adjust),
`GET /api/inventory/low-stock`.

Orders: `POST /api/orders` with `{ customer_id, items: [{product_id,
quantity}] }`, `POST /api/orders/:id/cancel`.

Reports: `GET /api/reports/sales-summary?from=&to=`,
`GET /api/reports/top-products`.
