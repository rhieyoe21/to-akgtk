# Progress Tracker

## Status keseluruhan

- [x] PRD dan kebutuhan produk disepakati.
- [x] MVP aplikasi dan deployment Docker Compose terimplementasi.
- [x] Validasi build, keamanan dependensi, skema/migrasi, dan alur API integrasi selesai.
- [ ] Pemeriksaan visual interaksi UI melalui browser pada mesin pengembangan.

## Tahapan

### 1. Dokumen dan fondasi

- [x] PRD dengan peran, alur, komposisi soal, keamanan, dan kriteria penerimaan.
- [x] Progress tracker.
- [x] Next.js JavaScript dan konfigurasi lint/build.
- [x] Skema PostgreSQL/Prisma dan migrasi.
- [x] Konfigurasi lingkungan dan dokumentasi setup.

### 2. Autentikasi dan keamanan

- [x] Pendaftaran peserta, login, logout, dan sesi aman (password minimal 8 karakter, toggle ikon).
- [x] Durasi ujian berwaktu dapat dikustom (1–600 menit) saat memulai tryout.
- [x] Dashboard peserta tidak lagi menampilkan jumlah soal di bank.
- [x] Halaman masuk/daftar mengarahkan pengguna aktif ke dashboard sesuai peran; navbar menunggu status sesi.
- [x] Menu publik (Kompetensi, Tentang simulasi) disembunyikan di dashboard, riwayat, dan halaman ujian.
- [x] Notifikasi pendaftaran berhasil dan fallback redirect ke halaman login.
- [x] Toggle password, konfirmasi password, fallback POST, dan kredensial tidak ditampilkan pada URL.
- [x] Fitur ubah password di dashboard peserta dan panel admin; sesi lain dicabut setelah berhasil.
- [x] Bootstrap admin privat serta manajemen pengguna.
- [x] Reset password via email dan reset oleh admin.
- [x] Log `[reset-password]` menampilkan tautan reset di development saat SMTP gagal/belum diatur; tidak mencatat token di production.
- [x] Rate limit forgot/reset password dilewati di development dan tetap aktif di production.
- [x] Validasi input, otorisasi server, nonce CSP, cookie aman, rate limiting, dan proteksi secret.
- [x] Pencabutan sesi setelah reset password/perubahan status akun.

### 3. Bank soal dan AI

- [x] CRUD bank soal, status aktif, hapus satu soal, dan hapus batch soal terpilih.
- [x] Filter status aktif/nonaktif/semua, filter tingkat kesulitan, dan kolom kesulitan pada tabel bank soal.
- [x] Tombol "Pilih semua" memilih seluruh data sesuai filter (bukan hanya halaman) untuk aksi batch.
- [x] Statistik bank soal admin menyegar otomatis setelah perubahan soal.
- [x] Toggle sembunyikan sumber per soal di baris tabel (field `hideSource`, tersalin ke snapshot) dan aksi batch sembunyikan/tampilkan sumber.
- [x] Soal hasil generate AI otomatis `hideSource = true`; tabel bank soal default menampilkan status Aktif.
- [x] Pengaturan global `hideSources` menyembunyikan sumber pada halaman evaluasi/hasil, bukan pada tabel bank soal.
- [x] Pagination pada tabel soal, peserta, dan hasil dengan tombol ikon halaman pertama/terakhir.
- [x] Pengaturan dinamis batas jumlah soal per batch dan generate per jam dari panel admin.
- [x] Integrasi generasi Gemini server-side.
- [x] Checkbox Google Search grounding dengan validasi URL terhadap metadata sitasi Gemini.
- [x] Respons generate kosong/non-JSON menampilkan error yang jelas dan metadata diagnostik Gemini untuk admin.
- [x] Prompt Gemini meminta tautan langsung artikel/dokumen asli, bukan homepage domain.
- [x] Validasi per soal: tautan spesifik disimpan, homepage/struktur tidak valid dilewati dengan alasan tanpa menggagalkan seluruh batch.
- [x] Audit tautan sumber server-side (HTTP, soft-404, tipe konten, relevansi) dengan proteksi SSRF.
- [x] Grounding best-effort: saat Google Search tidak memberi sitasi, sumber tetap divalidasi lewat audit.
- [x] Opsi verifikasi bukti isi halaman dengan Gemini (default nonaktif) dan pengaturan di panel admin.
- [x] Pilihan tingkat kesulitan soal (mudah/sedang/sulit/campuran) saat generate dan disimpan pada soal.
- [x] Aturan prompt opsi jawaban masuk akal dan homogen (distraktor plausibel).
- [x] Deteksi duplikat kode terhadap bank soal dan dalam batch sebelum audit sumber.
- [x] Validasi struktur respons AI dan penyimpanan sumber.
- [x] UI admin untuk membuat, mengedit, mengaktifkan, dan menonaktifkan soal.
- [x] Impor soal via upload berkas JSON atau tempel JSON; kolom `sourceUrl`, `sourceTitle`, dan `explanation` opsional, dengan validasi dan deteksi duplikat.
- [x] Form tambah/edit soal ditampilkan sebagai modal agar tidak perlu menggulir ke atas.

### 4. Tryout dan evaluasi

- [x] Seleksi acak 80/40 soal dengan kuota tiap kategori.
- [x] Pengacakan soal dan opsi serta snapshot historis.
- [x] Navigasi, penyimpanan jawaban, timer, dan mode tanpa batas waktu.
- [x] Sesi ujian persisten: jawaban tersimpan saat `keepalive`/pagehide, pemulihan sesi setelah restart, dan penguncian satu sesi aktif dengan tombol Lanjutkan/Batalkan.
- [x] Timer berbasis `startedAt` server tetap berjalan saat halaman tertutup; sesi kedaluwarsa otomatis dikumpulkan.
- [x] Skor, rincian kategori, kunci, pembahasan, sumber, dan riwayat.
- [x] Halaman hasil admin serta dialog terima kasih/donasi.

### 5. Pengujian dan deployment

- [x] ESLint, production build, Prisma validate/migrate, dan `npm audit` (0 vulnerabilities).
- [x] Integrasi API mode singkat dan penuh; autentikasi/otorisasi, kuota, penyimpanan jawaban, hasil, dan pencabutan sesi.
- [x] Pagination API tabel admin dan navigasi halaman.
- [x] Dockerfile dan Docker Compose untuk web, PostgreSQL, Cloudflare Tunnel.
- [x] `.env.example`, `.gitignore`, startup menolak kredensial contoh, dan panduan Ubuntu/backup.
- [x] Docker Compose tanpa service cloudflared (tunnel dijalankan di host) dan port host 3434.
- [x] Override development memakai project terpisah (`to-akgtk-dev`), volume sendiri, dan port DB 5433 agar aman berdampingan dengan production.
- [x] `DATABASE_URL` production dibangun otomatis dari `POSTGRES_*` (host `db`, password di-URL-encode) untuk mencegah error P1001.
- [x] Skrip pemulihan `P1000` (`scripts/reset-db-password.sh`) menyamakan password PostgreSQL tanpa menghapus data; petunjuk kegagalan migrasi ditampilkan saat startup.
- [x] Seed bank soal awal dari `prisma/seed-data/questions.json` (hanya saat bank kosong) dan skrip ekspor soal.
- [x] Seed hanya bank soal + admin awal; tidak menyertakan data peserta maupun hasil tryout.
- [x] Skrip pemeliharaan membersihkan awalan opsi A./B./C./D. pada data lama.
- [x] Pesan/URL donasi dapat diatur dari panel admin (Pengaturan) tanpa restart.
- [x] Verifikasi migrasi, bootstrap admin, healthcheck, dan CSP nonce pada HTML.
- [ ] Pemeriksaan browser visual tertunda: host pengembangan belum memiliki library sistem Chrome (`libatk-1.0.so.0`) dan pemasangannya memerlukan hak sudo.
