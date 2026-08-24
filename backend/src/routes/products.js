import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { search, category_id, low_stock, page = 1, pageSize = 20 } = req.query;

  const clauses = ['is_active = 1'];
  const params = [];

  if (search) {
    clauses.push('(name LIKE ? OR sku LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    clauses.push('category_id = ?');
    params.push(category_id);
  }
  if (low_stock === 'true') {
    clauses.push('quantity <= reorder_level');
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM products ${where}`).get(...params).count;
  const items = db.prepare(
    `SELECT * FROM products ${where} ORDER BY name LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({ items, total, page: Number(page) || 1, pageSize: limit });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { sku, name, description, category_id, price, cost, reorder_level } = req.body;
  if (!sku || !name || price === undefined) {
    throw new ApiError(400, 'sku, name and price are required');
  }
  if (Number(price) < 0 || (cost !== undefined && Number(cost) < 0)) {
    throw new ApiError(400, 'price and cost must be non-negative');
  }

  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
  if (existing) throw new ApiError(409, 'SKU already exists');

  const info = db.prepare(
    `INSERT INTO products (sku, name, description, category_id, price, cost, reorder_level, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(sku, name, description || null, category_id || null, price, cost || 0, reorder_level ?? 5);

  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
}));

router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const { name, description, category_id, price, cost, reorder_level, is_active } = req.body;

  db.prepare(
    `UPDATE products SET
      name = ?, description = ?, category_id = ?, price = ?, cost = ?, reorder_level = ?, is_active = ?
     WHERE id = ?`
  ).run(
    name ?? product.name,
    description ?? product.description,
    category_id ?? product.category_id,
    price ?? product.price,
    cost ?? product.cost,
    reorder_level ?? product.reorder_level,
    is_active === undefined ? product.is_active : (is_active ? 1 : 0),
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.status(204).send();
}));

export default router;
