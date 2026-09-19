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

  notifySellers(result.lastInsertRowid, req.user.userId, items);

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.json({ order: toPublicOrder(row) });
});

function notifySellers(orderId, buyerId, items) {
  const buyer = db.prepare('SELECT name, surname FROM users WHERE id = ?').get(buyerId);
  const buyerName = buyer ? `${buyer.name} ${buyer.surname}` : 'Foydalanuvchi';

  const bySeller = new Map(); // seller_id -> [{ name, qty }]
  for (const item of items) {
    const product = db.prepare('SELECT seller_id, name FROM products WHERE id = ?').get(item.id);
    if (!product || product.seller_id === buyerId) continue; // product removed, or you ordered your own listing
    const list = bySeller.get(product.seller_id) || [];
    list.push({ name: item.name || product.name, qty: item.qty });
    bySeller.set(product.seller_id, list);
  }

  const insert = db.prepare(
    'INSERT INTO notifications (user_id, message, order_id) VALUES (?, ?, ?)'
  );
  for (const [sellerId, list] of bySeller) {
    const itemsText = list.map((i) => `${i.name} x${i.qty}`).join(', ');
    const message = `${buyerName} sizning mahsulotingizni buyurtma qildi: ${itemsText}`;
    insert.run(sellerId, message, orderId);
  }
}

module.exports = router;
