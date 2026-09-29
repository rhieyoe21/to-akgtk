# PRD — Simulasi Tryout AKGTK Kepala Madrasah

## Ringkasan

Aplikasi SaaS pembelajaran dan simulasi Asesmen Kompetensi Guru dan Tenaga Kependidikan (AKGTK) untuk kompetensi Kepala Madrasah. Peserta dapat membuat akun, mengerjakan tryout, dan mengulas hasil beserta kunci serta sumber. Satu admin pusat mengelola peserta, bank soal, dan hasil. Soal dapat dibuat oleh admin dengan bantuan Gemini.

> Aplikasi ini hanya untuk pembelajaran dan simulasi. Soal tidak mencerminkan atau menjamin kesamaan dengan soal asli AKGTK yang akan berlangsung.

## Tujuan dan bukan tujuan

- Menyediakan latihan dengan komposisi kompetensi yang ditetapkan.
- Menyimpan percobaan dan evaluasi peserta secara permanen.
- Memungkinkan admin menyusun bank soal dengan cepat melalui Gemini.
- Menyediakan deployment mandiri pada Ubuntu dengan Docker Compose (port host 3434). Cloudflare Tunnel dijalankan terpisah di host dan diarahkan ke `127.0.0.1:3434`, sehingga tidak disertakan sebagai layanan Compose.
- Tidak menyediakan pembayaran atau langganan berbayar pada versi awal; dialog penutup dapat menyampaikan ajakan donasi.

## Pengguna dan hak akses

### Peserta

- Mendaftar dengan nama, nama sekolah bebas, email, password, dan konfirmasi password.
- Masuk, meminta reset password melalui email, dan mengikuti tryout.
- Melihat hasil serta evaluasi setelah mengumpulkan dan membuka riwayat percobaan sebelumnya.

### Admin pusat

- Dibuat privat saat instalasi melalui konfigurasi lingkungan; tidak ada pendaftaran admin publik.
- Melihat, menonaktifkan, atau mengelola akun peserta.
- Membuat soal dengan Gemini, memeriksa/mengubah soal, mengaktifkan/menonaktifkan soal (termasuk secara batch), menghapus satu soal, atau menghapus beberapa soal yang dipilih.
- Menyaring bank soal berdasarkan status (aktif/nonaktif/semua) dan tingkat kesulitan; kesulitan juga ditampilkan sebagai kolom pada tabel bank soal.
- Mengatur sembunyikan sumber **per soal** lewat toggle di baris tabel bank soal, dapat diubah secara batch (sembunyikan/tampilkan sumber terpilih), plus pengaturan global untuk menyembunyikan semua sumber.
- Sumber disembunyikan pada **halaman evaluasi/hasil**, bukan pada tabel bank soal; snapshot percobaan menyimpan status sembunyikan sumber saat ujian dibuat.
- Soal hasil generate AI otomatis ditandai menyembunyikan sumber; admin dapat menampilkannya kembali per soal atau secara batch.
- Tabel bank soal secara default menampilkan soal berstatus Aktif.
- Memilih seluruh soal yang cocok dengan filter (lintas halaman) untuk aksi batch, bukan hanya baris pada halaman aktif.
- Statistik bank soal (jumlah aktif per kompetensi) menyegar otomatis setelah soal dibuat, diubah, dihapus, atau diaktifkan/dinonaktifkan.
- Melihat hasil semua peserta.
- Menjelajahi tabel bank soal, peserta, dan hasil dengan pagination; tersedia kontrol ikon untuk menuju halaman pertama dan terakhir.
- Mengatur batas generate AI tanpa restart: jumlah soal per batch (1–50) dan batas generate per jam (1–100); nilai awal 20 soal dan 8 generate/jam.

## Pendaftaran dan autentikasi

- Pendaftaran tidak memerlukan verifikasi email.
- Setelah daftar berhasil, tampilkan notifikasi dan arahkan peserta ke halaman login; peserta masuk menggunakan akun yang baru dibuat.
- Kredensial login/pendaftaran hanya dikirim melalui POST body, tidak melalui query string atau URL.
- Reset password memakai token sekali pakai yang dikirim melalui SMTP, memiliki masa berlaku terbatas, dan disimpan dalam bentuk hash. Admin dapat membantu mereset akun.
- Password minimal 8 karakter dan disimpan menggunakan bcrypt cost 12; sesi menggunakan cookie HTTP-only, Secure saat HTTPS, dan SameSite. Toggle tampilkan/sembunyikan password memakai ikon.
- Peserta dan admin dapat mengubah password sendiri dari dasbor/panel (perlu password saat ini); setelah berhasil, sesi lain dicabut dan sesi aktif tetap berjalan.
- Email digunakan untuk login dan pemulihan akun.

## Bank soal

Setiap soal memuat kompetensi, tingkat kesulitan (mudah/sedang/sulit; hasil generate dapat memakai mode campuran), teks soal, empat atau lebih opsi jawaban (UI awal mendukung empat), indeks jawaban benar, pembahasan opsional, URL langsung/canonical ke artikel, peraturan, atau dokumen sumber asli (bukan homepage domain), judul sumber opsional, status aktif, informasi pembuat/waktu, serta metadata AI opsional. Hanya soal aktif masuk ke seleksi tryout.

Admin dapat menghasilkan soal per kompetensi melalui Gemini API, dengan opsi Google Search grounding. Validasi dilakukan per soal: soal dengan URL sumber lengkap (bukan sekadar homepage/domain) tetap disimpan, sedangkan soal dengan URL homepage, URL tidak valid, atau struktur tidak lengkap dilewati beserta alasannya. Setiap URL juga menjalani audit tautan langsung di server—memastikan dapat diakses, bukan 404 lunak, berisi halaman/PDF, dan isinya cukup relevan—sehingga sumber tetap valid ketika Google Search tidak menyediakan sitasi. Opsi tambahan memakai Gemini untuk memverifikasi bukti isi halaman. Jika grounding diaktifkan dan mengembalikan sitasi, URL soal wajib cocok dengan sitasi tersebut. Admin memilih tingkat kesulitan saat generate. Prompt mewajibkan opsi jawaban yang homogen dan masuk akal (tidak ada opsi yang jelas salah; distraktor mencerminkan miskonsepsi umum) serta melarang soal duplikat. Sistem juga menolak duplikat secara kode, baik terhadap bank soal maupun di dalam satu batch, sebelum sumber diaudit. Hasil AI langsung disimpan di bank soal, dan admin melihat jumlah soal tersimpan serta alasan soal yang dilewati. Admin dapat mengoreksi, menonaktifkan, menghapus satu soal, atau menghapus batch soal terpilih. Penghapusan soal dari bank tidak menghapus snapshot jawaban pada evaluasi tryout yang telah selesai. Kunci, pembahasan, URL dan judul sumber ditampilkan dalam evaluasi.

## Tryout

| Mode | Jumlah | Manajerial | Supervisi | Kewirausahaan | Moderasi Beragama | Waktu |
|---|---:|---:|---:|---:|---:|---|
| Penuh | 80 | 36 | 12 | 12 | 20 | 120 menit atau tanpa batas |
| Singkat | 40 | 18 | 6 | 6 | 10 | 60 menit atau tanpa batas |

- Soal diambil secara acak dari soal aktif, tanpa pengulangan dalam satu percobaan.
- Urutan soal dan opsi jawaban diacak pada setiap percobaan.
- Tryout hanya dapat dimulai jika jumlah soal aktif mencukupi untuk seluruh kuota kategori; UI menjelaskan kategori yang perlu dilengkapi.
- Peserta dapat melewati soal, berpindah melalui navigasi nomor, kembali, dan mengubah jawaban sebelum submit.
- Jawaban disimpan ke server setiap kali dipilih dan tetap tersimpan walaupun halaman ditutup atau di-restart sebelum dikumpulkan.
- Hanya satu sesi tryout aktif per peserta. Memulai tryout baru ditolak di server selama sesi aktif belum dikumpulkan atau dibatalkan; dashboard menampilkan tombol **Lanjutkan sesi** dan tombol mulai dinonaktifkan.
- Peserta dapat membatalkan sesi aktif (status ABANDONED, tidak dinilai dan tidak masuk riwayat) agar tidak terkunci permanen.
- Percobaan bertimer memakai `startedAt` server sehingga waktu tetap berjalan meski halaman tertutup; saat dibuka kembali, sisa waktu dihitung ulang dari deadline. Percobaan yang kedaluwarsa otomatis dikumpulkan dengan jawaban yang sudah tersimpan.
- Percobaan dapat dilakukan berulang kali tanpa batas. Setiap percobaan adalah rekaman permanen tersendiri.

## Hasil dan evaluasi

- Skor berupa persentase jawaban benar, tanpa ambang atau status kelulusan.
- Tampilkan skor keseluruhan, rincian per kompetensi, jawaban peserta, kunci yang benar, pembahasan jika tersedia, dan sumber soal.
- Durasi ujian berwaktu dapat disesuaikan (1–600 menit) saat memulai; mode tanpa batas waktu tetap tersedia.
- Setiap percobaan menyimpan snapshot soal, opsi, kunci, pembahasan, dan sumber agar evaluasi historis tetap akurat walaupun bank soal kemudian diedit.
- Dialog setelah tryout mengucapkan terima kasih serta menampilkan pesan/link donasi. Pesan dan URL donasi diatur oleh admin melalui panel Pengaturan tanpa restart; nilai environment hanya cadangan.
- Tidak menyediakan langganan berbayar; donasi bersifat opsional.

## Keamanan dan privasi

- Seluruh kredensial (Gemini, database, SMTP, Cloudflare Tunnel, dan secret aplikasi) diletakkan di `.env` pada server. `.env` wajib di-ignore Git; `.env.example` berisi placeholder palsu saja.
- Gemini API hanya dipanggil server-side. Secret tidak pernah memakai prefiks `NEXT_PUBLIC_` atau dikirim ke browser.
- Gunakan validasi server, perlindungan CSRF sesuai pola framework, query ORM terparameterisasi, pembatasan laju login/reset/generasi AI, otorisasi admin pada setiap tindakan, header keamanan, serta cookie aman.
- Catat aktivitas operasional tanpa password, token reset, secret, atau isi sensitif.
- Batasi akses database dari internet, gunakan user database berhak minimum, dan buat backup berkala dengan akses terbatas.
- Data percobaan disimpan permanen sesuai kebutuhan produk. Penghapusan akun harus mempertimbangkan hubungan ke riwayat yang tersimpan.

## Teknologi dan deployment

- JavaScript (tanpa TypeScript), Next.js App Router, PostgreSQL, Prisma.
- Docker Compose menjalankan web, database, dan Cloudflare Tunnel. Port database tidak dipublikasikan ke host secara default.
- Admin bootstrap melalui `ADMIN_EMAIL` dan `ADMIN_PASSWORD` saat setup; password awal di-hash dan nilai konfigurasi tidak ditampilkan kembali.
- TLS publik ditangani Cloudflare Tunnel. SMTP dan domain ditentukan pada konfigurasi deployment.

## Kriteria penerimaan

1. Peserta dapat daftar/login tanpa verifikasi email, logout, dan reset password melalui email.
2. Admin dapat menghasilkan soal Gemini ke bank soal dan mengelola soal serta melihat hasil peserta.
3. Tryout penuh/singkat menggunakan kuota tepat dan mendukung mode bertimer/tanpa waktu.
4. Jawaban dapat diubah, soal dapat dilewati, dan submit/timeout menghasilkan evaluasi yang dapat dibuka lagi.
5. Evaluasi historis menampilkan snapshot jawaban, kunci, pembahasan, dan sumber.
6. Kredensial tidak tersimpan di Git maupun bundel client; deployment Compose dapat mengikuti panduan.

## Asumsi konfigurasi

- Empat opsi jawaban adalah nilai awal; struktur data mendukung jumlah opsi fleksibel.
- SMTP, kunci Gemini, token tunnel, domain, serta teks/link donasi diberikan oleh operator pada saat deployment.
- Bahasa UI adalah Bahasa Indonesia.
