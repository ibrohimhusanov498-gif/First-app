#!/usr/bin/env bash
# FreshBozor backend — VPS'da deploy qilish skripti.
# Ishlatilishi: ushbu fayl loyiha ildizida (docker-compose.yml bilan bir joyda) turgan holda:
#   ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

HEALTH_PORT=4005

if [ ! -f .env ]; then
  echo "Xato: .env fayli topilmadi." >&2
  echo "  cp .env.example .env" >&2
  echo "  keyin .env ichida JWT_SECRET ni uzun, tasodifiy qiymatga almashtiring (masalan: openssl rand -hex 32)" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Xato: docker topilmadi. Avval Docker o'rnating." >&2
  exit 1
fi

DOCKER_COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
  else
    echo "Xato: docker compose (yoki docker-compose) topilmadi." >&2
    exit 1
  fi
fi

echo "==> Image qurilmoqda..."
$DOCKER_COMPOSE build

echo "==> Konteyner ishga tushirilmoqda..."
$DOCKER_COMPOSE up -d

echo "==> Holat:"
$DOCKER_COMPOSE ps

echo "==> Health-check kutilmoqda..."
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:${HEALTH_PORT}/health" > /dev/null; then
    echo "OK: backend ishlayapti (http://127.0.0.1:${HEALTH_PORT})"
    exit 0
  fi
  sleep 1
done

echo "Ogohlantirish: health-check javob bermadi. Loglarni tekshiring:" >&2
echo "  $DOCKER_COMPOSE logs -f" >&2
exit 1
