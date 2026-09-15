const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicOrder(row) {
  return {
    id: row.id,
    items: JSON.parse(row.items),
    total: row.total,
    createdAt: row.created_at,
  };
}

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.userId);
  res.json({ orders: rows.map(toPublicOrder) });
});

router.post('/', requireAuth, (req, res) => {
  const { items, total } = req.body;
  if (!Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    return res.status(400).json({ error: "Savatcha bo'sh" });
  }
  const result = db
    .prepare('INSERT INTO orders (user_id, items, total) VALUES (?, ?, ?)')
    .run(req.user.userId, JSON.stringify(items), total);

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.json({ order: toPublicOrder(row) });
});

module.exports = router;
