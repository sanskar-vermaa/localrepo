import bcrypt from 'bcryptjs';
import db from './db/index.js';

const adminPassword = bcrypt.hashSync('admin123', 10);

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
);
insertUser.run('Admin', 'admin@stockflow.dev', adminPassword, 'admin');

const categories = [
  ['Electronics', 'Phones, laptops, accessories'],
  ['Home & Kitchen', 'Appliances and kitchenware'],
  ['Stationery', 'Office and school supplies'],
];

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
for (const [name, description] of categories) {
  insertCategory.run(name, description);
}

const categoryRows = db.prepare('SELECT id, name FROM categories').all();
const categoryId = (name) => categoryRows.find((c) => c.name === name)?.id;

const products = [
  ['SKU-001', 'Wireless Mouse', 'Electronics', 799, 400, 10, 25],
  ['SKU-002', 'USB-C Charger', 'Electronics', 1299, 700, 8, 15],
  ['SKU-003', 'Blender', 'Home & Kitchen', 2499, 1500, 5, 6],
  ['SKU-004', 'Notebook Pack (5)', 'Stationery', 249, 120, 20, 40],
  ['SKU-005', 'Mechanical Keyboard', 'Electronics', 3499, 2100, 5, 3],
];

const insertProduct = db.prepare(
  `INSERT OR IGNORE INTO products (sku, name, category_id, price, cost, reorder_level, quantity)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
for (const [sku, name, catName, price, cost, reorder, qty] of products) {
  insertProduct.run(sku, name, categoryId(catName), price, cost, reorder, qty);
}

console.log('Seed complete. Admin login: admin@stockflow.dev / admin123');
