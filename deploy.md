# Panduan Deploy Production — Ruang AKGTK

Runbook langkah demi langkah untuk men-deploy **Ruang AKGTK** di server Ubuntu menggunakan Docker Compose. Aplikasi berjalan di `127.0.0.1:3434`, dan **Cloudflare Tunnel** yang sudah berjalan di host meneruskan trafik publik ke alamat tersebut.

> Ringkas alur: **Siapkan server → Clone repo → Isi `.env` → `docker compose up` → Arahkan tunnel → Buat admin → Isi bank soal → Verifikasi.**

---

## 1. Prasyarat

Siapkan di server:

- Ubuntu 22.04/24.04 (atau varian Debian).
- **Docker Engine** + **Docker Compose plugin** (v2).
- **OpenSSL**.
- **cloudflared** sudah terpasang dan berjalan sebagai service di host.
- Akses domain di Cloudflare (DNS dikelola Cloudflare).
- Opsional: kunci **Gemini API** (Google AI Studio) dan kredensial **SMTP**.

Verifikasi cepat:

```bash
docker --version
docker compose version
cloudflared --version
openssl version
```

---

## 2. Clone repository

```bash
cd /opt
sudo git clone https://github.com/rhieyoe21/to-akgtk.git to-akgtk
sudo chown -R "$USER":"$USER" /opt/to-akgtk
cd /opt/to-akgtk
```

> Gunakan SSH bila lebih nyaman, mis. `git clone git@github.com:rhieyoe21/to-akgtk.git`.

---

## 3. Siapkan `.env`

```bash
cp .env.example .env
chmod 600 .env
openssl rand -hex 32   # salin hasilnya untuk AUTH_SECRET
```

Edit `.env` (mis. `nano .env`) dan ganti **semua nilai contoh**. Aplikasi akan menolak nilai contoh (`replace-with`, `change-this-db-password`) saat startup.

| Variabel | Contoh aman | Catatan |
|---|---|---|
| `POSTGRES_DB` | `akgtk` | Nama database. |
| `POSTGRES_USER` | `akgtk` | User database. |
| `POSTGRES_PASSWORD` | password acak panjang | Jangan pakai contoh. |
| `DATABASE_URL` | `postgresql://akgtk:<PASSWORD>@db:5432/akgtk?schema=public` | Opsional. Pada Compose, nilai ini **dibangun otomatis** dari `POSTGRES_*` dengan host `db` (password otomatis di-URL-encode), jadi boleh dikosongkan. **Jangan** pakai host `localhost` di dalam container. |
| `AUTH_SECRET` | hasil `openssl rand -hex 32` | Minimal 32 karakter. |
| `APP_URL` | `https://tryout.domain-anda.com` | Harus sama dengan domain publik agar tautan reset benar. |
| `ADMIN_NAME` | `Administrator` | Nama admin awal. |
| `ADMIN_EMAIL` | email admin | Dipakai untuk login admin. |
| `ADMIN_PASSWORD` | password acak ≥ 8 karakter | Jangan pakai contoh. |
| `GEMINI_API_KEY` | `AIza...` | Opsional; hanya dipakai server. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Opsional. |
| `SMTP_*` | sesuai penyedia | Untuk reset password via email. |
| `DONATION_URL` / `DONATION_MESSAGE` | opsional | Dapat diubah nanti di panel Pengaturan. |

Pastikan password pada `DATABASE_URL` **sama** dengan `POSTGRES_PASSWORD`.

> **Jangan pernah** meng-commit `.env`, mengirimnya ke tiket dukungan, atau menempelkannya di chat.

---

## 4. Jalankan aplikasi

```bash
cd /opt/to-akgtk
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

Yang terjadi saat startup (dijalankan otomatis oleh `scripts/start.js`):

1. Migrasi database (`prisma migrate deploy`).
2. Seed: membuat akun admin awal dan memuat bank soal awal dari `prisma/seed-data/questions.json` **hanya jika bank soal masih kosong**.
3. Menjalankan Next.js pada port internal `3000`, dipublikasikan ke host `127.0.0.1:3434`.

Tunggu hingga log menampilkan `Ready` lalu tekan `Ctrl+C` untuk keluar dari log (container tetap berjalan).

---

## 5. Verifikasi lokal

```bash
docker compose ps                 # db healthy, web healthy
curl -fsS http://127.0.0.1:3434/api/health   # {"status":"ok"}
```

Jika `{"status":"ok"}` muncul, aplikasi dan database sudah siap.

---

## 6. Cloudflare Tunnel (host)

`cloudflared` **tidak** dijalankan oleh Docker; ia sudah berjalan di host. Arahkan ingress ke port aplikasi `3434`.

Contoh konfigurasi ingress (sesuaikan dengan konfigurasi tunnel Anda):

```yaml
# ~/.cloudflared/config.yml (contoh)
tunnel: <TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: tryout.domain-anda.com
    service: http://127.0.0.1:3434
  - service: http_status:404
```

Lalu:

```bash
cloudflared tunnel route dns <NAMA_TUNNEL> tryout.domain-anda.com
sudo systemctl restart cloudflared    # bila cloudflared berjalan sebagai service
```

Alternatif: buat public hostname di dashboard **Cloudflare Zero Trust → Networks → Tunnels** dan arahkan ke `http://127.0.0.1:3434`.

Terakhir, set `APP_URL=https://tryout.domain-anda.com` di `.env` dan restart `web`:

```bash
docker compose up -d web
```

---

## 7. Masuk sebagai admin

1. Buka `https://tryout.domain-anda.com/login`.
2. Masuk memakai `ADMIN_EMAIL` dan `ADMIN_PASSWORD`.
3. Anda akan diarahkan ke panel **/admin**.

Segera setelah login pertama, disarankan:

- Ganti password admin melalui fitur lupa password (akan memakai SMTP) atau atur ulang `ADMIN_PASSWORD` lalu restart.
- Buat ulang `AUTH_SECRET` dan `ADMIN_PASSWORD` bila pernah bocor.

---

## 8. Siapkan bank soal

1. Buka **/admin → Bank soal → Buat dengan AI**.
2. Pilih kompetensi, **tingkat kesulitan**, jumlah, dan (opsional) centang **Google Search grounding**.
3. Tinjau hasil: setiap sumber melewati **audit tautan** (bukan homepage, bukan 404, isi relevan). Soal yang gagal akan dilewati beserta alasannya.
4. Aktifkan/nonaktifkan atau sembunyikan sumber per soal maupun secara batch.

Pastikan jumlah soal aktif mencukupi kuota tryout:

- **Tryout penuh (80):** Manajerial 36, Supervisi 12, Kewirausahaan 12, Moderasi Beragama 20.
- **Tryout singkat (40):** Manajerial 18, Supervisi 6, Kewirausahaan 6, Moderasi Beragama 10.

Data soal awal dari seed sudah tersedia; tambahkan bila perlu.

---

## 9. Pembaruan (update) aplikasi

```bash
cd /opt/to-akgtk
git pull
docker compose up -d --build
docker compose logs -f web
```

Migrasi dijalankan otomatis. Volume `postgres_data` tetap tersimpan sehingga data aman.

---

## 10. Backup & restore

**Backup** (di host):

```bash
cd /opt/to-akgtk
sh scripts/backup.sh
```

Menghasilkan `backups/akgtk-<timestamp>.sql.gz`. Simpan salinan **terenkripsi** di lokasi terpisah (bukan hanya di server yang sama).

Contoh enkripsi + hapus asli:

```bash
gpg -c backups/akgtk-*.sql.gz
rm backups/akgtk-*.sql.gz
```

**Restore** ke database baru:

```bash
gunzip -c backups/akgtk-<timestamp>.sql.gz | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Uji prosedur restore secara berkala di lingkungan terpisah.

---

## 11. Keamanan & firewall

- **Jangan** buka port `3434` ke internet; cukup loopback karena tunnel mengakses `127.0.0.1`.
- Batasi akses `22` (SSH) dan jangan mengekspos Docker daemon.
- `chmod 600 .env` dan batasi backup.
- Aktifkan HTTPS hanya melalui Cloudflare Tunnel (TLS ditangani Cloudflare).
- Rotasi kredensial (`AUTH_SECRET`, password DB, admin, Gemini, SMTP) secara berkala.
- Aplikasi sudah menerapkan: cookie sesi aman, hash bcrypt, rate limit, audit tautan anti-SSRF, dan CSP nonce. Tetap tinjau isi soal/kunci/sumber sebelum dipakai.

Contoh aturan firewall (ufw):

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80,443/tcp   # bila diperlukan Cloudflare
sudo ufw deny 3434/tcp
sudo ufw enable
```

---

## 12. Troubleshooting

| Gejala | Solusi |
|---|---|
| Container `web` restart terus | Lihat `docker compose logs web`. Biasanya nilai contoh di `.env` belum diganti. |
| `P1001: Can't reach database server at localhost:5432` | `.env` memakai host `localhost` padahal di dalam container harus `db`. Perbaikan otomatis: isi `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (start.js membangun `DATABASE_URL` dengan host `db`). Pastikan `POSTGRES_PASSWORD` sama dengan password yang dipakai `DATABASE_URL`, lalu `docker compose up -d --build web`. |
| `The table ... does not exist` | Jalankan `docker compose run --rm web ./node_modules/.bin/prisma migrate deploy` atau restart `web`. |
| Health check gagal | Pastikan `db` healthy: `docker compose ps`, lalu `docker compose logs db`. |
| Halaman tidak bisa diakses dari luar | Pastikan ingress tunnel mengarah ke `http://127.0.0.1:3434` dan `cloudflared` berjalan. |
| Tautan reset password salah domain | Set `APP_URL` ke domain publik lalu `docker compose up -d web`. |
| Email reset tidak terkirim | Periksa kredensial SMTP; banyak penyedia mematikan SMTP AUTH. |
| Generate AI gagal | Cek kuota/kunci Gemini dan batas di **Pengaturan**. Buka **Log diagnostik Gemini** di panel admin. |
| Tidak bisa memulai tryout | Peserta masih punya sesi aktif; lanjutkan atau batalkan sesi tersebut. |

---

## 13. Checklist go-live

- [ ] `.env` terisi nilai aman dan ber-permission `600`.
- [ ] `docker compose ps` menunjukkan `db` dan `web` healthy.
- [ ] `/api/health` mengembalikan `{"status":"ok"}`.
- [ ] Ingress Cloudflare Tunnel diarahkan ke `127.0.0.1:3434`.
- [ ] `APP_URL` sama dengan domain publik.
- [ ] Login admin berhasil.
- [ ] Bank soal aktif mencukupi kuota kedua mode.
- [ ] Backup pertama dibuat dan disimpan di lokasi terpisah.
- [ ] SMTP berfungsi untuk reset password.
