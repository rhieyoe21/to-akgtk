#!/bin/sh
set -eu

# Pemulihan Prisma P1000 (authentication failed).
#
# Biasanya karena volume PostgreSQL sudah terinisialisasi dengan password lama,
# sementara POSTGRES_PASSWORD di .env sudah berubah. Skrip ini menyamakan
# password user PostgreSQL dengan nilai POSTGRES_PASSWORD yang aktif TANPA
# menghapus data.
#
# Jalankan di folder proyek production:
#   sh scripts/reset-db-password.sh

echo "[1/3] Sinkronkan container db dengan .env ..."
docker compose up -d db >/dev/null

echo "[2/3] Samakan password user PostgreSQL dengan POSTGRES_PASSWORD ..."
docker compose cp scripts/reset-db-password.sql db:/tmp/reset-db-password.sql >/dev/null
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v user="$POSTGRES_USER" -v pw="$POSTGRES_PASSWORD" -f /tmp/reset-db-password.sql'

echo "[3/3] Jalankan web ..."
docker compose up -d web >/dev/null

echo "Selesai. Periksa: docker compose logs -f web"
