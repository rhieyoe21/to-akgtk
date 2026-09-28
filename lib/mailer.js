import nodemailer from "nodemailer";

export async function sendResetEmail(email, link) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) throw new Error("Konfigurasi SMTP belum lengkap.");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    tls: { minVersion: "TLSv1.2" }
  });
  await transporter.sendMail({
    from: SMTP_FROM, to: email, subject: "Atur ulang password Ruang AKGTK",
    text: `Gunakan tautan ini untuk mengatur ulang password Anda. Tautan berlaku selama 30 menit dan hanya dapat digunakan satu kali:\n\n${link}\n\nJika Anda tidak meminta perubahan password, abaikan email ini.`,
    html: `<p>Gunakan tautan berikut untuk mengatur ulang password Anda. Tautan berlaku selama 30 menit dan hanya dapat digunakan satu kali.</p><p><a href="${link}">Atur ulang password</a></p><p>Jika Anda tidak meminta perubahan password, abaikan email ini.</p>`
  });
}
