"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MODES } from "@/lib/constants";

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function ActiveSession({ attempt, initialRemaining = null }) {
  const deadline = attempt.timed ? new Date(attempt.startedAt).getTime() + attempt.durationSec * 1000 : null;
  const [remaining, setRemaining] = useState(initialRemaining);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (deadline === null) return undefined;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const interval = window.setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [deadline]);

  async function abandon() {
    if (!window.confirm("Batalkan sesi tryout ini? Jawaban pada sesi ini tidak akan dinilai dan tidak masuk riwayat.")) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/attempts/${attempt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sesi tidak dapat dibatalkan.");
      router.refresh();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return <section className="panel panel-pad active-session" style={{ marginBottom: 22 }}>
    <div className="active-session-info">
      <div className="eyebrow">Sesi berlangsung</div>
      <h2 style={{ fontSize: 20, margin: "4px 0" }}>{MODES[attempt.mode]?.label || "Tryout"} · {attempt._count?.items || 0} soal</h2>
      <p className="admin-note">{attempt.timed ? <>Sisa waktu <strong>{formatTime(remaining ?? 0)}</strong>. Waktu tetap berjalan meski halaman ditutup.</> : "Tanpa batas waktu. Jawaban tersimpan otomatis."}</p>
      {error && <div className="form-message" role="alert">{error}</div>}
    </div>
    <div className="user-actions">
      <Link className="button" href={`/tryout/${attempt.id}`}>Lanjutkan sesi</Link>
      <button className="button secondary" type="button" disabled={busy} onClick={abandon}>{busy ? "Membatalkan…" : "Batalkan sesi"}</button>
    </div>
  </section>;
}
