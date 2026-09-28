"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartTryout({ mode, disabled = false, defaultMinutes = 60 }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState(defaultMinutes);
  const router = useRouter();
  async function start(timed) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, timed, durationMinutes: timed ? Number(minutes) : undefined }) });
      const data = await res.json();
      if (res.status === 409 && data.attemptId) { router.push(`/tryout/${data.attemptId}`); return; }
      if (!res.ok) throw new Error(data.error || "Tryout tidak dapat dimulai.");
      router.push(`/tryout/${data.attempt.id}`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div>
    <div className="mode-controls">
      <button className="button small" disabled={busy || disabled} onClick={() => start(true)}>{busy ? "Menyiapkan…" : "Mulai dengan waktu"}</button>
      <button className="button small secondary" disabled={busy || disabled} onClick={() => start(false)}>Tanpa waktu</button>
    </div>
    <label className="minutes-field">Durasi <input type="number" min="1" max="600" value={minutes} disabled={disabled} onChange={(event) => setMinutes(event.target.value === "" ? "" : Number(event.target.value))} /> menit</label>
    {disabled && <p className="field-help" style={{ margin: "6px 0 0" }}>Selesaikan atau batalkan sesi yang berlangsung untuk memulai yang baru.</p>}
    {error && <p role="alert" className="form-message" style={{ marginBottom: 0 }}>{error}</p>}
  </div>;
}
