# FreshBozor backend

Node.js + Express + SQLite3 API for the FreshBozor mobile app (auth, product listings with photo upload, orders, and an admin-only user list).

## Setup

```bash
npm install
cp .env.example .env   # then edit .env: set a real JWT_SECRET
npm start
```

Server listens on `PORT` (default `4000`). SQLite database file (`data.sqlite`) and uploaded photos (`uploads/`) are created automatically and are git-ignored.

## API

- `POST /api/auth/register` — { name, surname, address, phone, email, password }
- `POST /api/auth/login` — { email, password }
- `POST /api/auth/reset-password` — { email, newPassword }
- `GET /api/auth/me` — current user (requires `Authorization: Bearer <token>`)
- `GET /api/products` / `POST /api/products` (multipart: name, category, price, image)
- `GET /api/orders/mine` / `POST /api/orders` — { items, total }
- `GET /api/users` — admin only (matches `ADMIN_EMAIL` in `.env`)
