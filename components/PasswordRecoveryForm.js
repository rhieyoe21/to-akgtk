"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PasswordToggle from "@/components/PasswordToggle";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tidak dapat memproses permintaan.");
      setMessage(data.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap"><form className="panel auth-card" method="post" action="/api/auth/forgot" onSubmit={submit}><div className="eyebrow">Pemulihan akun</div><h1>Lupa password?</h1><p>Masukkan email akun. Jika terdaftar, kami akan mengirim tautan untuk membuat password baru.</p><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>{error && <div className="form-message" role="alert">{error}</div>}{message && <div className="form-message form-success" role="status">{message}</div>}<button className="button" style={{ width: "100%" }} disabled={busy}>{busy ? "Mengirim…" : "Kirim tautan reset"}</button><p className="auth-foot"><Link href="/login">Kembali ke masuk</Link></p></form></div>;
}

export function ResetPasswordForm({ token }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/reset-password");
  }, [token]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tidak dapat memperbarui password.");
      setMessage(data.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-wrap"><form className="panel auth-card" method="post" action="/api/auth/reset" onSubmit={submit}><input type="hidden" name="token" value={token} /><div className="eyebrow">Pemulihan akun</div><h1>Buat password baru</h1><p>Pilih password yang kuat dan tidak digunakan di akun lain.</p><div className="field"><label htmlFor="password">Password baru</label><div className="password-control"><input id="password" name="password" type={showPassword ? "text" : "password"} required minLength="8" maxLength="128" autoComplete="new-password" /><PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} label="password baru" /></div><span className="field-help">Minimal 8 karakter.</span></div>{error && <div className="form-message" role="alert">{error}</div>}{message && <div className="form-message form-success" role="status">{message} <Link href="/login">Masuk</Link></div>}<button className="button" style={{ width: "100%" }} disabled={busy || !token}>{busy ? "Menyimpan…" : "Simpan password baru"}</button></form></div>;
}
