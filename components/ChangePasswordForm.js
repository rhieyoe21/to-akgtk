"use client";

import { useState } from "react";
import PasswordToggle from "@/components/PasswordToggle";

export default function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") };
    if (payload.newPassword !== payload.confirmPassword) {
      setError("Konfirmasi password baru belum sama.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password belum dapat diubah.");
      setMessage(data.message || "Password berhasil diubah.");
      event.target.reset();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <form className="edit-box" onSubmit={submit}>
    <div className="field"><label htmlFor="currentPassword">Password saat ini</label><div className="password-control"><input id="currentPassword" name="currentPassword" type={showCurrent ? "text" : "password"} required maxLength="128" autoComplete="current-password" /><PasswordToggle visible={showCurrent} onToggle={() => setShowCurrent((value) => !value)} label="password saat ini" /></div></div>
    <div className="field"><label htmlFor="newPassword">Password baru</label><div className="password-control"><input id="newPassword" name="newPassword" type={showNew ? "text" : "password"} required minLength="8" maxLength="128" autoComplete="new-password" /><PasswordToggle visible={showNew} onToggle={() => setShowNew((value) => !value)} label="password baru" /></div><span className="field-help">Minimal 8 karakter.</span></div>
    <div className="field"><label htmlFor="confirmPassword">Konfirmasi password baru</label><div className="password-control"><input id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required minLength="8" maxLength="128" autoComplete="new-password" /><PasswordToggle visible={showConfirm} onToggle={() => setShowConfirm((value) => !value)} label="konfirmasi password baru" /></div></div>
    {error && <div className="form-message" role="alert">{error}</div>}
    {message && <div className="form-message form-success" role="status">{message}</div>}
    <button className="button" disabled={busy}>{busy ? "Menyimpan…" : "Ubah password"}</button>
  </form>;
}
