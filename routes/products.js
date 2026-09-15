const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

function toPublicProduct(row, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    image: row.image.startsWith('http') ? row.image : `${base}${row.image}`,
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

router.post('/', requireAuth, upload.single('image'), (req, res) => {
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

module.exports = router;
