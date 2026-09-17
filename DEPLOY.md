# Deploy — fruits.road-test.uz

Backend Docker konteynerda ishlaydi, `127.0.0.1:4005` portida (tashqariga ochiq emas — faqat Nginx orqali). Bu port serverdagi boshqa loyihalar (4000, 4001, 4002, 4010, 3000-3600, 8080, 8090) bilan to'qnashmaydi.

## 1. Talablar (VPS'da bir marta)

- Docker + Docker Compose plugin (allaqachon bor, boshqa konteynerlar ishlab turibdi)
- Nginx
- Certbot (`sudo apt install certbot python3-certbot-nginx`)
- DNS: `fruits.road-test.uz` → server IP (tekshirilgan, to'g'ri sozlangan)

## 2. Loyihani serverga joylashtirish

```bash
# masalan /root/apps/ ichiga, boshqa loyihalar joylashgan joyga mos qiling
mkdir -p /root/apps && cd /root/apps
git clone <repo-url> freshbozor-backend
cd freshbozor-backend
```

Yoki mavjud kodni `scp`/`rsync` bilan ko'chiring.

## 3. .env yaratish

```bash
cp .env.example .env
```

`.env` faylini oching va:
- `JWT_SECRET` ni uzun, tasodifiy qiymatga almashtiring: `openssl rand -hex 32`
- `ADMIN_EMAIL` ni admin sifatida ishlatmoqchi bo'lgan email bilan almashtiring
- `PORT` ni o'zgartirmang (konteyner ichida doim 4000)

## 4. Portni tekshirish (ehtiyot chorasi)

```bash
ss -tulpn | grep 4005 || echo "4005 bo'sh"
```

Agar band bo'lsa, `docker-compose.yml` dagi `"127.0.0.1:4005:4000"` qatorini boshqa bo'sh portga o'zgartiring va pastdagi Nginx konfiguratsiyasida ham xuddi shu portni yozing.

## 5. Ishga tushirish

```bash
chmod +x deploy.sh
./deploy.sh
```

Skript image quradi, konteynerni ishga tushiradi va `/health` orqali tekshiradi. Konteyner `restart: unless-stopped` bilan sozlangan — server reboot bo'lganda ham avtomatik qayta ishga tushadi (Docker demoni odatda systemd orqali avtomatik boshlanadi).

## 6. Nginx + SSL

```bash
sudo cp deploy/nginx-fruits.road-test.uz.conf /etc/nginx/sites-available/fruits.road-test.uz
sudo ln -s /etc/nginx/sites-available/fruits.road-test.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d fruits.road-test.uz
```

Certbot avtomatik ravishda 443-portni va SSL sertifikatlarini nginx konfiguratsiyasiga qo'shadi hamda HTTP→HTTPS redirect taklif qiladi (rozi bo'ling).

## 7. Tekshirish

```bash
curl https://fruits.road-test.uz/health
# {"ok":true}
```

Mobil ilova endi API manzil sifatida `https://fruits.road-test.uz` ni ishlatadi.

## Keyingi yangilanishlarni deploy qilish

```bash
cd /root/apps/freshbozor-backend
git pull
./deploy.sh
```

Ma'lumotlar bazasi (`data.sqlite`) va yuklangan rasmlar Docker named volume'larda (`freshbozor_data`, `freshbozor_uploads`) saqlanadi — konteyner qayta qurilganda ham yo'qolmaydi.

## Foydali buyruqlar

```bash
docker compose logs -f          # loglarni kuzatish
docker compose ps               # holatni ko'rish
docker compose restart          # qayta ishga tushirish
docker compose down             # to'xtatish (volume'lar saqlanib qoladi)
```
