# StockFlow

StockFlow is a full-stack inventory and order management system. It tracks
products, stock levels, and customer orders for a small retail or wholesale
business, and keeps inventory consistent as orders are placed, cancelled, or
restocked.

## Why this exists

Spreadsheets fall apart once you need to know, in real time, how much stock
is left after concurrent sales, restocks, and cancellations. StockFlow
centralizes that state in a single source of truth (SQLite) and exposes it
through a REST API and a React dashboard, with every stock change recorded
as an auditable movement (`IN`, `OUT`, `ADJUSTMENT`).

## Features

- **Auth** — JWT-based login/register with `admin` and `staff` roles.
- **Product catalog** — categories, SKUs, pricing, cost, reorder thresholds.
- **Inventory** — restock, manual adjustments, and a full movement history
  per product for auditing.
- **Orders** — cart-style order creation that validates stock, decrements
  inventory, and records the sale atomically; cancellation restores stock.
- **Reporting** — low-stock alerts, sales summaries by date range, and
  top-selling products.
- **Search & pagination** — product and customer lists support search,
  category filtering, and pagination.

## Tech stack

| Layer    | Choice                                   |
|----------|-------------------------------------------|
| Frontend | React (Vite), React Router                |
| Backend  | Node.js, Express                           |
| Database | SQLite (better-sqlite3)                    |
| Auth     | JSON Web Tokens, bcrypt password hashing   |

Everything is plain JavaScript — no TypeScript build step.

## Project structure

```
localrepo/
├── backend/          Express API + SQLite
│   └── src/
│       ├── db/           schema + connection
│       ├── middleware/    auth, error handling
│       ├── routes/        auth, products, categories, customers,
│       │                  inventory, orders, reports
│       └── server.js
└── frontend/         React (Vite) dashboard
    └── src/
        ├── api/
        ├── context/
        ├── components/
        └── pages/
```

## Getting started

### Backend

```bash
cd backend
npm install
npm run seed   # optional: creates demo data
npm run dev
```

The API listens on `http://localhost:4000` by default. Copy
`backend/.env.example` to `backend/.env` to override `PORT` or `JWT_SECRET`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard runs on `http://localhost:5173` and proxies API calls to the
backend.

## Testing

The backend has 15 integration tests covering auth, product validation,
inventory guards, and the order/stock transaction logic:

```bash
cd backend
npm test
```

Each test file spins up the Express app on an ephemeral port against a
throwaway SQLite file, so tests never touch your local dev database.

## API overview

| Method | Endpoint                     | Description                        |
|--------|-------------------------------|-------------------------------------|
| POST   | `/api/auth/register`          | Create an account                   |
| POST   | `/api/auth/login`              | Log in, get a JWT                   |
| GET    | `/api/products`                | List products (search/filter/paginate) |
| POST   | `/api/products`                | Create a product (admin)            |
| POST   | `/api/inventory/movements`     | Restock or adjust stock             |
| GET    | `/api/inventory/low-stock`     | Products at or below reorder level  |
| POST   | `/api/orders`                  | Place an order, decrement stock     |
| POST   | `/api/orders/:id/cancel`       | Cancel an order, restore stock      |
| GET    | `/api/reports/sales-summary`   | Revenue and order count over a range|
| GET    | `/api/reports/top-products`    | Best-selling products               |
