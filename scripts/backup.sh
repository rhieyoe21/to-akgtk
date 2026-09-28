#!/bin/sh
set -eu

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="backups/akgtk-${timestamp}.sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "$output"
chmod 600 "$output"
printf 'Backup tersimpan: %s\n' "$output"
