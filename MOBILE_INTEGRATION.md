# FreshBozor API — mobil ilova integratsiyasi

To'liq qo'llanma: autentifikatsiya, barcha endpointlar, xatoliklar va tayyor kod namunalari.

## Base URL

```
https://fruits.road-test.uz
```

Backend ishlab turibdi va tekshirilgan (`GET /health` → `{"ok":true}`, HTTP so'rovlar avtomatik HTTPS'ga yo'naltiriladi, rasm URL'lari `https://` bilan qaytadi).

Barcha so'rovlar/javoblar `application/json` (faqat rasm yuklashda `multipart/form-data`). Xatolik xabarlari o'zbek tilida.

---

## Mundarija

1. [Autentifikatsiya oqimi](#1-autentifikatsiya-oqimi)
2. [Muhim biznes-qoidalar](#2-muhim-biznes-qoidalar)
3. [Endpointlar](#3-endpointlar)
4. [Xatoliklar formati](#4-xatoliklar-formati)
5. [To'liq kod namunasi (JavaScript / fetch)](#5-toliq-kod-namunasi-javascript--fetch)
6. [Cheklovlar va eslatmalar](#6-cheklovlar-va-eslatmalar)

---

## 1. Autentifikatsiya oqimi

1. `/api/auth/register` yoki `/api/auth/login` ga so'rov yuboriladi.
2. Javobda `token` (JWT, **30 kun** amal qiladi) va `user` obyekti qaytadi.
3. `token` qurilmada **xavfsiz** saqlanadi:
   - Flutter → `flutter_secure_storage`
   - React Native → `expo-secure-store` yoki Keychain/Keystore
   - Native Android/iOS → Keystore / Keychain
   - ❌ Oddiy `AsyncStorage` / `SharedPreferences`da emas
4. Himoyalangan **har bir** so'rovga qo'shiladi:
   ```
   Authorization: Bearer <token>
   ```
5. Ilova ochilganda saqlangan token bilan `GET /api/auth/me` chaqiriladi — agar `401` kelsa, token yaroqsiz/eskirgan, foydalanuvchi login ekraniga yo'naltiriladi va saqlangan token o'chiriladi.
6. Token muddati 30 kun — undan keyin har qanday himoyalangan so'rov `401` qaytaradi, shu holatni global tarzda ushlab (masalan HTTP client interceptor orqali) foydalanuvchini qayta login qilishga yo'naltirish tavsiya etiladi.

---

## 2. Muhim biznes-qoidalar

Bular ilova UI mantig'iga bevosita ta'sir qiladi:

- **Mahsulotlar umumiy**: bitta foydalanuvchi qo'shgan mahsulotni **barcha boshqa foydalanuvchilar** `GET /api/products` orqali ko'radi (filtrlash yo'q — bu "bozor" ro'yxati, faqat "mening e'lonlarim" emas). Tasdiqlangan va ishlab turibdi.
- **Mahsulotni faqat egasi o'chira oladi**: `DELETE /api/products/:id` — agar so'rov yuborgan foydalanuvchi mahsulot egasi bo'lmasa, `403` qaytadi. "Mening e'lonlarim" ekranida o'chirish tugmasini faqat `product.sellerId === joriy foydalanuvchi.id` bo'lganda ko'rsating — `sellerId` endi `GET /api/products` javobida keladi.
- **Login qilmasdan hech narsa ko'rinmaydi**: `GET /api/products` va `GET /api/orders/mine` ham token talab qiladi, mehmon rejimi yo'q.
- **Admin ekrani**: faqat `user.isAdmin === true` bo'lganda ko'rsatiladi (`/api/users` shuni tekshiradi).

---

## 3. Endpointlar

### `POST /api/auth/register` — ro'yxatdan o'tish

Body:
```json
{
  "name": "Ali",
  "surname": "Valiyev",
  "address": "Toshkent, Chilonzor",
  "phone": "+998901234567",
  "email": "ali@example.com",
  "password": "kamida-6-belgi"
}
```

Javob `200`:
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "name": "Ali",
    "surname": "Valiyev",
    "address": "Toshkent, Chilonzor",
    "phone": "+998901234567",
    "email": "ali@example.com",
    "createdAt": "2026-09-17 09:30:55",
    "isAdmin": false
  }
}
```

Xatoliklar: `400` (maydon to'liq emas), `409` (email band).

### `POST /api/auth/login` — kirish

Body: `{ "email": "...", "password": "..." }`
Javob: register bilan bir xil shakl (`token`, `user`).
Xatolik: `401` — `{"error":"Email yoki parol noto'g'ri"}`.

### `POST /api/auth/reset-password` — parolni tiklash

Body: `{ "email": "...", "newPassword": "kamida-6-belgi" }`
Javob: `{ "ok": true }`
Xatolik: `404` — bunday email topilmadi.

> Eslatma: bu endpoint hozircha email tasdiqlash (kod/link) talab qilmaydi — email'ni bilgan kishi parolni almashtira oladi. Ilovada "parolni unutdim" funksiyasi jiddiy ishlatilsa, keyinchalik tasdiqlash kodi qo'shish tavsiya etiladi.

### `GET /api/auth/me` — joriy foydalanuvchi

Header: `Authorization: Bearer <token>`
Javob: `{ "user": {...} }` (yuqoridagi shaklda)

### `GET /api/products` — mahsulotlar ro'yxati (barcha sotuvchilarniki)

Header: `Authorization: Bearer <token>` (majburiy)

Javob:
```json
{
  "products": [
    {
      "id": 1,
      "name": "Olma",
      "category": "Meva",
      "price": 15000,
      "image": "https://fruits.road-test.uz/uploads/1789...jpg",
      "sellerId": 1,
      "sellerName": "Ali",
      "sellerSurname": "Valiyev",
      "sellerAddress": "Toshkent, Chilonzor",
      "sellerPhone": "+998901234567",
      "createdAt": "2026-09-17 09:31:12"
    }
  ]
}
```

`image` — to'liq, to'g'ridan-to'g'ri ko'rsatish mumkin bo'lgan URL. Ro'yxat eng yangi mahsulotdan boshlab keladi (`createdAt DESC`).

### `POST /api/products` — mahsulot qo'shish

`multipart/form-data`, header: `Authorization: Bearer <token>`

| Maydon    | Tur   | Izoh                        |
|-----------|-------|-----------------------------|
| name      | text  | mahsulot nomi               |
| category  | text  | kategoriya                  |
| price     | text  | narx (son, masalan `15000`) |
| image     | file  | rasm, **max 8MB**            |

Javob `200`: `{ "product": {...} }` (yuqoridagi shakl bilan bir xil).

Xatoliklar:
- `400` — `{"error":"Barcha maydonlarni to'ldiring"}` (maydon yoki rasm yo'q)
- `400` — `{"error":"Rasm hajmi 8MB dan oshmasligi kerak"}` (rasm juda katta)
- `401` — token yo'q/yaroqsiz

### `DELETE /api/products/:id` — mahsulotni o'chirish (yangi)

Header: `Authorization: Bearer <token>`

Faqat mahsulotni **o'zi joylagan** foydalanuvchi o'chira oladi. Muvaffaqiyatli o'chirishda serverdagi rasm fayli ham tozalanadi.

Javob `200`: `{ "ok": true }`

Xatoliklar:
- `404` — `{"error":"Mahsulot topilmadi"}` (bunday id yo'q yoki allaqachon o'chirilgan)
- `403` — `{"error":"Ruxsat yo'q"}` (boshqa birovning mahsulotini o'chirishga urinish)
- `401` — token yo'q/yaroqsiz

### `GET /api/orders/mine` — mening buyurtmalarim

Header: `Authorization: Bearer <token>`

Javob:
```json
{
  "orders": [
    {
      "id": 1,
      "items": [{ "productId": 1, "qty": 2 }],
      "total": 30000,
      "createdAt": "2026-09-17 09:31:12"
    }
  ]
}
```

`items` — savatchaga qo'shilgan narsalarning erkin JSON tuzilmasi (ilova qanday yuborsa, xuddi shunday saqlanadi va qaytariladi). Faqat joriy foydalanuvchining buyurtmalari qaytadi.

### `POST /api/orders` — buyurtma yaratish

Header: `Authorization: Bearer <token>`

Body:
```json
{
  "items": [{ "productId": 1, "qty": 2 }],
  "total": 30000
}
```

- `items` — bo'sh bo'lmagan massiv
- `total` — son

Javob: `{ "order": {...} }`
Xatolik: `400` — `{"error":"Savatcha bo'sh"}`.

### `GET /api/users` — foydalanuvchilar ro'yxati (faqat admin)

Header: `Authorization: Bearer <token>` (token egasi `.env`dagi `ADMIN_EMAIL` bilan mos bo'lishi kerak)

Javob: `{ "users": [{ id, name, surname, address, phone, email, createdAt }, ...] }`
Xatolik: `403` — oddiy foydalanuvchi kirmoqchi bo'lsa.

Mobil ilovada bu ekranni faqat `user.isAdmin === true` bo'lganda ko'rsating (`isAdmin` maydoni `login`/`register`/`me` javoblarida keladi).

---

## 4. Xatoliklar formati

Har doim bir xil shakl:
```json
{ "error": "O'zbekcha xabar" }
```

| Status | Ma'no |
|--------|-------|
| `400` | noto'g'ri/yetishmayotgan maydonlar |
| `401` | token yo'q, yaroqsiz, muddati tugagan yoki login ma'lumotlari noto'g'ri |
| `403` | ruxsat yo'q (begona mahsulotni o'chirish, admin bo'lmagan holda admin endpointga kirish) |
| `404` | topilmadi |
| `409` | email allaqachon band (register) |
| `500` | server xatosi (`{"error":"Server xatosi"}`) |

Umumiy tavsiya: har bir so'rovda `res.ok`ni tekshiring, `false` bo'lsa javob bodisidan `error` maydonini o'qib foydalanuvchiga ko'rsating (bu xabarlar allaqachon o'zbek tilida, to'g'ridan-to'g'ri UI'da ishlatish mumkin).

---

## 5. To'liq kod namunasi (JavaScript / fetch)

```js
const BASE_URL = 'https://fruits.road-test.uz';

async function apiRequest(path, { method = 'GET', token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: form ? form : json ? JSON.stringify(json) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `So'rov muvaffaqiyatsiz (${res.status})`);
  return data;
}

// -- Auth --
const register = (payload) => apiRequest('/api/auth/register', { method: 'POST', json: payload });
const login = (email, password) => apiRequest('/api/auth/login', { method: 'POST', json: { email, password } });
const me = (token) => apiRequest('/api/auth/me', { token });

// -- Products --
const getProducts = (token) => apiRequest('/api/products', { token });

function createProduct(token, { name, category, price, imageFile }) {
  const form = new FormData();
  form.append('name', name);
  form.append('category', category);
  form.append('price', String(price));
  form.append('image', imageFile); // React Native: { uri, name, type }
  return apiRequest('/api/products', { method: 'POST', token, form });
}

const deleteProduct = (token, id) => apiRequest(`/api/products/${id}`, { method: 'DELETE', token });

// -- Orders --
const getMyOrders = (token) => apiRequest('/api/orders/mine', { token });
const createOrder = (token, items, total) =>
  apiRequest('/api/orders', { method: 'POST', token, json: { items, total } });
```

Foydalanish misoli:
```js
const { token, user } = await login('ali@example.com', 'parol123');
const { products } = await getProducts(token);
const { product } = await createProduct(token, {
  name: 'Olma', category: 'Meva', price: 15000, imageFile,
});
await deleteProduct(token, product.id); // faqat shu tokenning egasi bo'lgani uchun ishlaydi
```

---

## 6. Cheklovlar va eslatmalar

- Rasm yuklashda fayl hajmi **8MB**dan katta bo'lmasin — bundan katta bo'lsa `400` va tushunarli xabar qaytadi
- Barcha `email`lar serverda kichik harfga o'giriladi (`Ali@Example.com` va `ali@example.com` bir xil hisoblanadi)
- `password` uzunligi uchun faqat `reset-password`da minimal cheklov bor (6 belgi) — `register`da mobil ilova o'zi tekshirishi tavsiya etiladi
- Token 30 kun amal qiladi — undan keyin `401`, foydalanuvchi qayta login qilishi kerak
- `GET /api/products` va `GET /api/orders/mine` token talab qiladi — mehmon (login qilmagan) rejim yo'q
- Mahsulot o'chirilganda serverdagi rasm fayli ham o'chiriladi — qayta tiklab bo'lmaydi, UI'da tasdiqlash dialogi ko'rsatish tavsiya etiladi

Agar ilova Flutter, React Native yoki boshqa aniq stackda yozilayotgan bo'lsa, ayting — o'sha tilga mos to'liq ishlaydigan misol (Dart/`dio`, Kotlin/`Retrofit` va h.k.) qo'shib beraman.
