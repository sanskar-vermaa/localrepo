import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/movements', requireAuth, asyncHandler(async (req, res) => {
  const { product_id } = req.query;
  if (product_id) {
    return res.json(
      db.prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC').all(product_id)
    );
  }
  res.json(db.prepare('SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 200').all());
}));

// Restock or adjust inventory for a product. type: IN | ADJUSTMENT
router.post('/movements', requireAuth, requireRole('admin', 'staff'), asyncHandler(async (req, res) => {
  const { product_id, type, quantity, reason } = req.body;

  if (!product_id || !type || quantity === undefined) {
    throw new ApiError(400, 'product_id, type and quantity are required');
  }
  if (!['IN', 'ADJUSTMENT'].includes(type)) {
    throw new ApiError(400, 'type must be IN or ADJUSTMENT');
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) throw new ApiError(404, 'Product not found');

  const delta = type === 'IN' ? Math.abs(Number(quantity)) : Number(quantity);
  const newQuantity = product.quantity + delta;

  if (newQuantity < 0) {
    throw new ApiError(400, 'Resulting stock quantity cannot be negative');
  }

  const applyMovement = db.transaction(() => {
    db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(newQuantity, product_id);
    return db.prepare(
      `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
       VALUES (?, ?, ?, ?, ?)`
    ).run(product_id, type, delta, reason || null, req.user.id);
  });

  const info = applyMovement();

  res.status(201).json({
    movement: db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(info.lastInsertRowid),
    product: db.prepare('SELECT * FROM products WHERE id = ?').get(product_id),
  });
}));

router.get('/low-stock', requireAuth, asyncHandler(async (req, res) => {
  const items = db.prepare(
    'SELECT * FROM products WHERE is_active = 1 AND quantity <= reorder_level ORDER BY quantity ASC'
  ).all();
  res.json(items);
}));

export default router;
