const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "Rasm hajmi 8MB dan oshmasligi kerak" });
    }
    if (err) return next(err);
    next();
  });
}

function toPublicProduct(row, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    image: row.image.startsWith('http') ? row.image : `${base}${row.image}`,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerSurname: row.seller_surname,
    sellerAddress: row.seller_address,
    sellerPhone: row.seller_phone,
    createdAt: row.created_at,
  };
}

const PRODUCTS_WITH_SELLER = `
  SELECT products.*, users.name AS seller_name, users.surname AS seller_surname,
         users.address AS seller_address, users.phone AS seller_phone
  FROM products JOIN users ON users.id = products.seller_id
`;

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`${PRODUCTS_WITH_SELLER} ORDER BY products.created_at DESC`).all();
  res.json({ products: rows.map((r) => toPublicProduct(r, req)) });
});

router.post('/', requireAuth, handleUpload, (req, res) => {
  const { name, category, price } = req.body;
  if (!name || !category || !price || !req.file) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }
  const imagePath = `/uploads/${req.file.filename}`;
  const result = db
    .prepare('INSERT INTO products (name, category, price, image, seller_id) VALUES (?, ?, ?, ?, ?)')
    .run(name, category, Number(price), imagePath, req.user.userId);

  const row = db.prepare(`${PRODUCTS_WITH_SELLER} WHERE products.id = ?`).get(result.lastInsertRowid);
  res.json({ product: toPublicProduct(row, req) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Mahsulot topilmadi' });
  }
  if (row.seller_id !== req.user.userId) {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(row.id);

  const imageFile = path.join(UPLOADS_DIR, path.basename(row.image));
  fs.unlink(imageFile, () => {}); // best-effort cleanup, ignore if already gone

  res.json({ ok: true });
});

module.exports = router;
