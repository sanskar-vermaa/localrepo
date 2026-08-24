import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { status, customer_id } = req.query;
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (customer_id) {
    clauses.push('customer_id = ?');
    params.push(customer_id);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orders = db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC`).all(...params);
  res.json(orders);
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const items = db.prepare(
    `SELECT oi.*, p.name AS product_name, p.sku
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`
  ).all(req.params.id);

  res.json({ ...order, items });
}));

// Create an order: validates stock, decrements inventory, records OUT movements,
// all inside a single transaction so partial failures never leave stale stock.
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { customer_id, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'items must be a non-empty array of { product_id, quantity }');
  }

  const createOrder = db.transaction(() => {
    let total = 0;
    const resolvedItems = [];

    for (const { product_id, quantity } of items) {
      if (!product_id || !quantity || quantity <= 0) {
        throw new ApiError(400, 'each item needs a valid product_id and positive quantity');
      }

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
      if (!product || !product.is_active) {
        throw new ApiError(404, `Product ${product_id} not found or inactive`);
      }
      if (product.quantity < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}: have ${product.quantity}, need ${quantity}`);
      }

      resolvedItems.push({ product, quantity, unit_price: product.price });
      total += product.price * quantity;
    }

    const orderInfo = db.prepare(
      'INSERT INTO orders (customer_id, status, total, created_by) VALUES (?, ?, ?, ?)'
    ).run(customer_id || null, 'COMPLETED', total, req.user.id);

    const orderId = orderInfo.lastInsertRowid;

    for (const { product, quantity, unit_price } of resolvedItems) {
      db.prepare(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
      ).run(orderId, product.id, quantity, unit_price);

      db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(quantity, product.id);

      db.prepare(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_order_id, created_by)
         VALUES (?, 'OUT', ?, 'order fulfillment', ?, ?)`
      ).run(product.id, quantity, orderId, req.user.id);
    }

    return orderId;
  });

  const orderId = createOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.status(201).json(order);
}));

// Cancel an order and restore the stock that was reserved for it.
router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const cancelOrder = db.transaction(() => {
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

    for (const item of orderItems) {
      db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
      db.prepare(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, reference_order_id, created_by)
         VALUES (?, 'IN', ?, 'order cancelled', ?, ?)`
      ).run(item.product_id, item.quantity, req.params.id, req.user.id);
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('CANCELLED', req.params.id);
  });

  cancelOrder();
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
}));

export default router;
