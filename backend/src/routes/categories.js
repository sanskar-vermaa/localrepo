import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  res.json(category);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, 'name is required');

  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) throw new ApiError(409, 'Category name already exists');

  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
  res.status(201).json({ id: info.lastInsertRowid, name, description: description || null });
}));

router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?')
    .run(name ?? category.name, description ?? category.description, req.params.id);

  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).send();
}));

export default router;
