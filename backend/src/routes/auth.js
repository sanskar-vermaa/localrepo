import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'password must be at least 6 characters');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const safeRole = role === 'admin' ? 'admin' : 'staff';

  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, passwordHash, safeRole);

  const user = { id: info.lastInsertRowid, name, email, role: safeRole };
  res.status(201).json({ user, token: signToken(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'email and password are required');
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.json({ user, token: signToken(user) });
}));

export default router;
