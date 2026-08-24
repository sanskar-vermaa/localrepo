import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { search } = req.query;
  if (search) {
    const rows = db.prepare(
      'SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? ORDER BY name'
    ).all(`%${search}%`, `%${search}%`);
    return res.json(rows);
  }
  res.json(db.prepare('SELECT * FROM customers ORDER BY name').all());
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  res.json(customer);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) throw new ApiError(400, 'name is required');

  const info = db.prepare(
    'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)'
  ).run(name, email || null, phone || null, address || null);

  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid));
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  const { name, email, phone, address } = req.body;
  db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?')
    .run(name ?? customer.name, email ?? customer.email, phone ?? customer.phone, address ?? customer.address, req.params.id);

  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
}));

export default router;
