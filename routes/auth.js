const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    address: row.address,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    isAdmin: row.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase(),
  };
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  const { name, surname, address, phone, email, password } = req.body;
  if (!name || !surname || !address || !phone || !email || !password) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare(
      'INSERT INTO users (name, surname, address, phone, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, surname, address, phone, email.toLowerCase(), passwordHash);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.json({ token: signToken(row.id), user: toPublicUser(row) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  res.json({ token: signToken(row.id), user: toPublicUser(row) });
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lsin" });
  }
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row) {
    return res.status(404).json({ error: "Bu email bilan ro'yxat topilmadi" });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.id);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!row) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  res.json({ user: toPublicUser(row) });
});

module.exports = router;
