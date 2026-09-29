# Ruang AKGTK

Aplikasi SaaS pembelajaran dan simulasi **Asesmen Kinerja Guru dan Tenaga Kependidikan (AKGTK)** untuk kompetensi **Kepala Madrasah** di lingkungan Kementerian Agama. Peserta dapat mendaftar, mengerjakan tryout, dan mengulas hasil beserta kunci dan sumber. Satu admin pusat mengelola bank soal, peserta, dan hasil, serta dapat membuat soal dengan bantuan Google Gemini.

> **Catatan:** Aplikasi ini hanya untuk pembelajaran dan simulasi. Soal tidak mencerminkan atau menjamin kesamaan dengan soal asli AKGTK yang akan berlangsung.

---

## Daftar isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur proyek](#struktur-proyek)
- [Prasyarat](#prasyarat)
- [Menjalankan di Ubuntu dengan Docker Compose](#menjalankan-di-ubuntu-dengan-docker-compose)
- [Cloudflare Tunnel](#cloudflare-tunnel)
- [Pengembangan lokal](#pengembangan-lokal)
- [Variabel lingkungan](#variabel-lingkungan)
- [Perintah npm](#perintah-npm)
- [Alur penggunaan](#alur-penggunaan)
- [Bank soal & AI](#bank-soal--ai)
- [Keamanan](#keamanan)
- [Backup & pembaruan](#backup--pembaruan)
- [Pengujian](#pengujian)
- [Pemecahan masalah](#pemecahan-masalah)
- [Dokumen](#dokumen)

---

## Fitur

### Peserta

- Pendaftaran sederhana: nama, sekolah/madrasah (bebas), email, password, dan konfirmasi password. Tidak perlu verifikasi email.
- Login/logout dengan sesi aman, lupa/reset password via email (atau reset oleh admin).
- Dua mode tryout dengan komposisi kompetensi yang tetap:
  - **Tryout penuh:** 80 soal — Manajerial 36, Supervisi 12, Kewirausahaan 12, Moderasi Beragama 20.
  - **Tryout singkat:** 40 soal — Manajerial 18, Supervisi 6, Kewirausahaan 6, Moderasi Beragama 10.
- **Durasi dapat disesuaikan** (1–600 menit) untuk mode berwaktu, atau **tanpa batas waktu**.
- Navigasi nomor soal berwarna, melewati soal, mengubah jawaban, dan mengumpulkan kapan saja.
- **Jawaban tersimpan otomatis** (termasuk saat halaman ditutup/di-restart) dengan `keepalive` dan pengiriman ulang saat `pagehide`.
- **Satu sesi aktif** per peserta: tidak bisa memulai tryout baru saat masih ada sesi; tersedia tombol **Lanjutkan sesi** dan **Batalkan sesi**.
- **Timer berbasis server**: waktu tetap berjalan meski halaman ditutup; sesi yang kedaluwarsa otomatis dikumpulkan.
- Hasil & evaluasi lengkap: skor, rincian per kompetensi, jawaban Anda, kunci, pembahasan, dan sumber.
- Riwayat tryout permanen yang dapat dibuka kembali kapan saja.

### Admin pusat

- Dibuat privat saat instalasi melalui variabel lingkungan; tidak ada pendaftaran admin publik.
- Bank soal: tambah/edit manual, buat dengan AI, aktif/nonaktif, hapus satu/​batch.
- Filter bank soal: kompetensi, status (Aktif/Nonaktif/Semua; default **Aktif**), tingkat kesulitan, dan pencarian teks.
- Aksi batch: aktifkan/nonaktifkan, sembunyikan/tampilkan sumber, dan hapus — termasuk **Pilih semua** lintas halaman sesuai filter.
- Pagination dengan tombol ikon halaman pertama/sebelumnya/berikutnya/terakhir.
- Toggle **sumber di evaluasi** per soal dan pengaturan global menyembunyikan semua sumber.
- Kelola peserta: aktif/nonaktif dan reset password.
- Lihat hasil tryout semua peserta dan buka evaluasinya.
- Pengaturan AI: batas soal per batch, batas generate per jam, audit tautan sumber, verifikasi bukti, dan sembunyikan sumber global.
- Form tambah/edit soal berbentuk **modal** dan statistik bank soal menyegar otomatis.

---

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Bahasa | JavaScript (tanpa TypeScript) |
| Framework web | Next.js 16 (App Router) + React 19 |
| Basis data | PostgreSQL 16 |
| ORM | Prisma 6 |
| Autentikasi | JWT (`jose`) dalam cookie HTTP-only + hash password `bcryptjs` |
| Email | Nodemailer (SMTP) |
| AI | Google Gemini API (`@google/generative-ai` via REST) |
| Deployment | Docker Compose + Cloudflare Tunnel |
| Lint/Test | ESLint (config Next) & `node --test` |

---

## Struktur proyek

```
.
├── app/                     # Next.js App Router
│   ├── api/                 # Route handler (auth, attempts, results, admin, health)
│   ├── admin/               # Panel admin
│   ├── dashboard/           # Dashboard peserta
│   ├── history/             # Riwayat tryout
│   ├── tryout/[id]/         # Halaman ujian
│   ├── results/[id]/        # Halaman evaluasi
│   ├── login, register, forgot-password, reset-password
│   ├── globals.css          # Desain/tema
│   └── layout.js
├── components/              # Komponen klien (React)
├── lib/                     # Logika server: auth, db, gemini, source audit, attempts, dll.
├── prisma/                  # schema.prisma, migrasi, seed
├── scripts/                 # start.js (migrasi+seed+start), backup.sh
├── tests/                   # Pengujian unit (node --test)
├── docker-compose.yml       # Layanan: db, web, cloudflared (profil tunnel)
├── docker-compose.dev.yml   # Override dev: expose PostgreSQL ke loopback
├── Dockerfile
├── .env.example             # Template produksi
└── .env.development.example # Template development
```

---

## Prasyarat

- **Docker Engine** dan **Docker Compose plugin** (untuk deployment dan basis data development).
- **Node.js 20+** dan npm (untuk pengembangan lokal).
- **OpenSSL** (membuat `AUTH_SECRET`).
- Opsional: kunci **Gemini API**, kredensial **SMTP**, dan **Cloudflare Tunnel token**.

---

## Menjalankan di Ubuntu dengan Docker Compose

1. Pasang Docker Engine dan Docker Compose plugin.

2. Clone repository, lalu siapkan konfigurasi:

   ```bash
   git clone https://github.com/rhieyoe21/to-akgtk.git to-akgtk
   cd to-akgtk
   cp .env.example .env
   chmod 600 .env
   openssl rand -hex 32
   ```

3. Edit `.env` pada server. Ganti **semua nilai contoh** (aplikasi menolak secret/password contoh saat startup):

   - `AUTH_SECRET` — nilai acak minimal 32 karakter.
   - `POSTGRES_PASSWORD` dan `DATABASE_URL` — password database (host harus `db`, dan password di-URL-encode bila mengandung karakter khusus).
   - `ADMIN_EMAIL` dan `ADMIN_PASSWORD` — akun admin awal (minimal 8 karakter).
   - `APP_URL` — alamat publik, mis. `https://tryout.example.com`.
   - `GEMINI_API_KEY` — kunci Gemini (opsional; hanya dipakai server).
   - `SMTP_*` — untuk reset password via email.

   **Jangan unggah `.env` ke Git, tiket dukungan, atau chat publik.**

4. Jalankan layanan:

   ```bash
   docker compose up -d --build
   docker compose logs -f web
   ```

   Migrasi database dijalankan otomatis, admin dibuat pada startup pertama, dan **bank soal awal** dimuat dari `prisma/seed-data/questions.json` (hanya jika bank soal masih kosong). Halaman masuk admin memakai `ADMIN_EMAIL` dan `ADMIN_PASSWORD`.

5. Periksa kesehatan aplikasi:

   ```bash
   curl -fsS http://127.0.0.1:3434/api/health
   # {"status":"ok"}
   ```

Port web di-bind ke `127.0.0.1:3434` (port internal kontainer tetap 3000). PostgreSQL tidak dipublikasikan ke host. Karena `cloudflared` sudah berjalan di host, compose **tidak** menyertakan service tunnel; arahkan tunnel ke `http://127.0.0.1:3434`.

---

## Cloudflare Tunnel

`cloudflared` diasumsikan **sudah berjalan di host** (bukan di dalam compose), sehingga tidak ada service tunnel di `docker-compose.yml`.

1. Arahkan ingress tunnel ke aplikasi: `http://127.0.0.1:3434` (port web yang dipublikasikan).
2. Tambahkan **public hostname** di Cloudflare Zero Trust yang mengarah ke alamat tersebut.
3. Set `APP_URL` di `.env` sama dengan domain publik agar tautan reset password benar.

TLS publik ditangani Cloudflare. Bila tunnel berjalan di jaringan host yang sama, tidak perlu mengekspos port ke internet.

---

## Pengembangan lokal

Development menjalankan Next.js langsung pada host untuk hot reload, sedangkan PostgreSQL berjalan dalam Docker dan hanya dibuka ke loopback.

```bash
cp .env.development.example .env
chmod 600 .env
openssl rand -hex 32
```

Edit `.env`: ganti `AUTH_SECRET`, password contoh, dan `ADMIN_EMAIL`/`ADMIN_PASSWORD`; masukkan Gemini API key. Pastikan `DATABASE_URL` memakai host **`localhost`**.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Buka `http://localhost:3000` atau alamat LAN server. Development otomatis mengizinkan IPv4 LAN untuk resource HMR; tambahkan hostname lewat `DEV_ALLOWED_ORIGINS` bila perlu. **Jangan** menjalankan service `web` dari Compose bersamaan dengan `npm run dev` (keduanya memakai port 3000).

Menghentikan database development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

Volume database tetap tersimpan; tambahkan `-v` hanya jika ingin menghapus data lokal.

### Reset password di development

Bila SMTP belum dikonfigurasi atau gagal (misalnya penyedia mematikan SMTP AUTH), log server menampilkan `[reset-password]` beserta tautan reset agar tetap dapat diuji tanpa email:

```bash
grep '\[reset-password\]' /tmp/opencode/to-akgtk-dev.log   # atau lihat terminal npm run dev
```

Di **production**, tautan tidak pernah dicatat dan kegagalan kirim membatalkan token. Rate limit permintaan reset password dilewati di development dan tetap aktif di production.

---

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Ya | Kredensial container PostgreSQL. |
| `DATABASE_URL` | Tidak* | DSN PostgreSQL. Pada Compose dibangun otomatis dari `POSTGRES_*` dengan host `db` (password otomatis di-URL-encode); *wajib hanya bila `POSTGRES_*` tidak diset. Untuk dev di host gunakan `localhost`. |
| `AUTH_SECRET` | Ya | Secret penandatangan JWT, minimal 32 karakter. |
| `APP_URL` | Ya | URL publik aplikasi (untuk tautan reset). |
| `ADMIN_NAME` | Tidak | Nama admin awal (default `Administrator`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Ya | Akun admin awal; dibuat saat startup. |
| `GEMINI_API_KEY` | Tidak | Kunci Gemini untuk generate soal (server-side). |
| `GEMINI_MODEL` | Tidak | Default `gemini-3.5-flash-lite`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Tidak* | Untuk reset password via email. *Wajib bila memakai email di produksi. |
| `DONATION_URL`, `DONATION_MESSAGE` | Tidak | Nilai awal donasi (opsional). Dapat diubah kapan saja di **Pengaturan** panel admin tanpa restart; nilai env dipakai sebagai cadangan. |
| `DEV_ALLOWED_ORIGINS` | Tidak | Hostname tambahan untuk resource HMR di development. |

> Jangan pernah memberi prefix `NEXT_PUBLIC_` pada variabel rahasia. Kunci Gemini hanya dipakai di sisi server.

---

## Perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan (hot reload). |
| `npm run build` | `prisma generate` lalu build produksi Next.js. |
| `npm start` | Menjalankan hasil build (produksi). |
| `npm run lint` | Menjalankan ESLint. |
| `npm test` | Menjalankan pengujian `node --test`. |
| `npm run db:generate` | Membuat Prisma Client. |
| `npm run db:migrate` | `prisma migrate dev` (development). |
| `npm run db:deploy` | Menerapkan migrasi (produksi). |
| `npm run db:seed` | Membuat admin awal dari `.env`. |

---

## Alur penggunaan

1. **Pendaftaran** — peserta membuat akun; setelah berhasil diarahkan ke halaman login dengan notifikasi.
2. **Pilih latihan** — pilih mode penuh/singkat, tentukan durasi (atau tanpa waktu), lalu mulai.
3. **Mengerjakan** — jawaban tersimpan otomatis; timer berjalan di server. Jika halaman tertutup, sesi tetap tersimpan dan dapat dilanjutkan.
4. **Evaluasi** — setelah dikumpulkan, peserta melihat skor, rincian kompetensi, kunci, pembahasan, dan sumber (kecuali sumber disembunyikan).
5. **Admin** — kelola bank soal, peserta, hasil, dan pengaturan AI di `/admin`.

---

## Bank soal & AI

- Soal berisi kompetensi, tingkat kesulitan, empat opsi, kunci, pembahasan, URL sumber langsung, judul sumber, status aktif, dan status sembunyikan sumber.
- Admin memilih **tingkat kesulitan** (mudah/sedang/sulit/campuran) saat generate.
- Prompt mewajibkan opsi jawaban yang masuk akal dan homogen (distraktor plausibel) serta melarang soal duplikat.
- **Anti-duplikat** diperiksa di kode terhadap bank soal dan di dalam satu batch.
- **Audit tautan sumber** di server memastikan tautan langsung dapat diakses, bukan homepage, bukan soft-404, berisi halaman/PDF, dan relevan; alamat jaringan privat ditolak (anti-SSRF).
- **Google Search grounding** opsional. Bila grounding tidak memberi sitasi, sumber tetap divalidasi lewat audit tautan.
- **Verifikasi bukti isi halaman** dengan Gemini opsional (menambah pemakaian kuota).
- Soal hasil AI otomatis menandai **sumber disembunyikan** dan tetap dapat diubah per soal atau secara batch.
- Hanya soal **aktif** yang dipilih untuk tryout.

---

## Keamanan

- `.env` dikecualikan dari Git dan disarankan ber-permission `600`. `.env.example` hanya berisi placeholder.
- Password minimal 8 karakter dan di-hash dengan bcrypt cost 12. Reset password dan perubahan status akun mencabut sesi lama.
- Cookie sesi HTTP-only, SameSite strict, dan Secure pada production.
- API membatasi login, register, reset password, generate AI, dan pembuatan tryout (rate limit). Pembatasan reset password dilewati hanya di development.
- Reset token disimpan dalam hash, sekali pakai, dan kedaluwarsa dalam 30 menit.
- Admin dibuat dari environment saat startup; jangan buka akses SSH/Docker daemon ke publik. Batasi akses server dan backup.
- Setiap sumber hasil AI menjalani audit tautan dan penolakan SSRF. Tetap lakukan pemeriksaan manual atas isi soal, kunci, dan sumber sebelum dipakai untuk latihan.

---

## Backup & pembaruan

Backup manual database:

```bash
sh scripts/backup.sh
```

Simpan salinan terenkripsi di lokasi **terpisah** dari server; backup pada host yang sama tidak melindungi dari kerusakan host.

Pembaruan aplikasi:

```bash
git pull
docker compose --profile tunnel up -d --build
```

Migrasi database dijalankan sebelum aplikasi mulai. Uji pemulihan backup secara berkala dan rotasi kredensial melalui prosedur deployment yang terkendali.

---

## Data awal & pemeliharaan

- **Seed bank soal:** `prisma/seed-data/questions.json` dimuat otomatis oleh `npm run db:seed`/startup **hanya bila bank soal kosong**, sehingga tidak menimpa data yang sudah ada. Seed hanya berisi **bank soal** (dan akun admin awal); **tidak** memasukkan data peserta maupun hasil tryout.
- **Bersihkan awalan opsi** (`A.`, `B)`, `C:`, `D -`) pada data lama:

  ```bash
  node --env-file=.env scripts/clean-option-prefixes.js
  ```

- **Ekspor bank soal** ke format seed (mengganti `questions.json`):

  ```bash
  node --env-file=.env scripts/export-questions.js
  ```

- **Pulihkan password database** (mengatasi `P1000`) tanpa menghapus data:

  ```bash
  sh scripts/reset-db-password.sh
  ```

- **Atur pesan/URL donasi** dari panel admin → **Pengaturan**; tampil pada dialog setelah tryout. Nilai env `DONATION_*` hanya cadangan.

## Pengujian

```bash
npm run lint
npm test
npm audit
```

Cakupan tes: validasi URL sumber, penyaringan sitasi grounding, deteksi soft-404/SSRF, relevansi sumber, deteksi duplikat soal, dan alur pipeline generate + audit + verifikasi.

---

## Pemecahan masalah

| Gejala | Kemungkinan penyebab & solusi |
|---|---|
| Aplikasi menolak start | Nilai contoh pada `AUTH_SECRET`/`ADMIN_PASSWORD`/`DATABASE_URL` belum diganti. |
| `The table ... does not exist` | Migrasi belum diterapkan: `npx prisma migrate deploy`. |
| `P1001: Can't reach database server` | `DATABASE_URL` memakai host `localhost`. Di container gunakan host `db`; isi `POSTGRES_*` agar dibangun otomatis, lalu `docker compose up -d --build web`. |
| `P1000: Authentication failed` | Volume PostgreSQL diinisialisasi dengan password lama. Samakan tanpa menghapus data: `sh scripts/reset-db-password.sh`. |
| Email reset tidak terkirim | Konfigurasi SMTP salah atau penyedia mematikan SMTP AUTH. Cek log `[reset-password]`. |
| Generate AI gagal | Kuota/limit Gemini, API key salah, atau batas aplikasi tercapai. Lihat **Log diagnostik Gemini** di panel admin. |
| Sumber soal ditolak | Audit tautan menolak homepage/soft-404/tidak relevan. Periksa alasan pada notifikasi. |
| `WebSocket connection ... failed` | Buka via alamat LAN yang diizinkan; tambahkan hostname ke `DEV_ALLOWED_ORIGINS`. |
| Tidak bisa memulai tryout | Masih ada sesi aktif. Lanjutkan atau batalkan sesi tersebut lebih dulu. |

---

## Dokumen

- `PRD.md` — kebutuhan produk, alur, aturan, dan kriteria penerimaan.
- `PROGRESS.md` — status implementasi dan tracker.

---

Dibuat untuk membantu para calon dan penggerak pemimpin madrasah belajar dan berlatih. Gunakan dengan bijak.
