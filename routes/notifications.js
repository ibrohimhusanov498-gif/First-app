const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicNotification(row) {
  return {
    id: row.id,
    message: row.message,
    orderId: row.order_id,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.userId);
  const unreadCount = rows.filter((r) => !r.is_read).length;
  res.json({ notifications: rows.map(toPublicNotification), unreadCount });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(
    req.user.userId
  );
  res.json({ ok: true });
});

module.exports = router;
