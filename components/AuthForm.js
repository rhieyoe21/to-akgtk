"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordToggle from "@/components/PasswordToggle";

export default function AuthForm({ mode, registrationComplete = false }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(registrationComplete ? "Pendaftaran berhasil. Silakan masuk dengan email dan password yang baru dibuat." : "");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    // Remove old credential query strings from the address bar if one was opened from browser history.
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (isRegister && payload.password !== payload.confirmPassword) {
      setError("Konfirmasi password belum sama.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tidak dapat memproses permintaan.");
      if (isRegister) {
        router.push(data.redirectTo || "/login?registered=1");
        router.refresh();
        return;
      }
      window.dispatchEvent(new Event("akgtk-auth-changed"));
      router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-wrap"><form className="panel auth-card" method="post" action={`/api/auth/${isRegister ? "register" : "login"}`} onSubmit={submit}>
    <div className="eyebrow">Ruang AKGTK</div><h1>{isRegister ? "Buat akun latihan" : "Selamat datang kembali"}</h1>
    <p>{isRegister ? "Isi data singkat untuk menyimpan progres dan hasil tryout Anda." : "Masuk untuk melanjutkan latihan dan membuka riwayat hasil."}</p>
    {notice && !isRegister && <div role="status" className="form-message form-success">{notice}</div>}
    {isRegister && <>
      <div className="field"><label htmlFor="name">Nama lengkap</label><input id="name" name="name" autoComplete="name" required minLength="2" maxLength="120" /></div>
      <div className="field"><label htmlFor="school">Nama sekolah/madrasah</label><input id="school" name="school" autoComplete="organization" required maxLength="160" /></div>
    </>}
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength="254" /></div>
    <div className="field"><label htmlFor="password">Password</label><div className="password-control"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : 1} maxLength="128" /><PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /></div>{isRegister && <span className="field-help">Minimal 8 karakter.</span>}</div>
    {isRegister && <div className="field"><label htmlFor="confirmPassword">Konfirmasi password</label><div className="password-control"><input id="confirmPassword" name="confirmPassword" type={showConfirmation ? "text" : "password"} autoComplete="new-password" required minLength="8" maxLength="128" /><PasswordToggle visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} label="konfirmasi password" /></div></div>}
    {!isRegister && <p className="field-help" style={{ textAlign: "right", marginTop: -6 }}><Link href="/forgot-password" className="text-link">Lupa password?</Link></p>}
    {error && <div role="alert" className="form-message">{error}</div>}
    <button className="button" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>{busy ? "Memproses…" : isRegister ? "Buat akun" : "Masuk"}</button>
    <p className="auth-foot">{isRegister ? "Sudah memiliki akun?" : "Belum memiliki akun?"} <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Masuk" : "Daftar"}</Link></p>
  </form></div>;
}
