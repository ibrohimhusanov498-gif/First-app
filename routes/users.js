const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const me = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.userId);
  if (!me || me.email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  const rows = db
    .prepare('SELECT id, name, surname, address, phone, email, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      name: r.name,
      surname: r.surname,
      address: r.address,
      phone: r.phone,
      email: r.email,
      createdAt: r.created_at,
    })),
  });
});

module.exports = router;
