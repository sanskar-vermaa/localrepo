import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/sales-summary', requireAuth, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const clauses = ["status = 'COMPLETED'"];
  const params = [];

  if (from) {
    clauses.push('created_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('created_at <= ?');
    params.push(to);
  }

  const where = `WHERE ${clauses.join(' AND ')}`;
  const summary = db.prepare(
    `SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS revenue
     FROM orders ${where}`
  ).get(...params);

  res.json(summary);
}));

router.get('/top-products', requireAuth, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const rows = db.prepare(
    `SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.unit_price) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status = 'COMPLETED'
     GROUP BY p.id
     ORDER BY units_sold DESC
     LIMIT ?`
  ).all(Number(limit) || 10);

  res.json(rows);
}));

export default router;
