"use client";

import { useState } from "react";

const EXAMPLE = `{
  "questions": [
    {
      "category": "Manajerial",
      "prompt": "Tuliskan teks pertanyaan di sini?",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctIndex": 0,
      "explanation": "Pembahasan (opsional)",
      "sourceUrl": "https://contoh.go.id/artikel (opsional)",
      "sourceTitle": "Judul sumber (opsional)",
      "difficulty": "sedang",
      "hideSource": false,
      "isActive": true
    }
  ]
}`;

export default function QuestionImport({ onImported, onClose }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try { setText(await file.text()); }
    catch { setError("Berkas tidak dapat dibaca."); }
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { setError("JSON tidak valid. Periksa kembali teks/berkas."); setBusy(false); return; }
    const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      setError("JSON harus berisi array soal atau objek {\"questions\": [...]}.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/questions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questions }) });
      const data = await res.json();
      if (!res.ok && res.status !== 422) throw new Error(data.error || "Impor gagal.");
      setResult(data);
      if (data.created > 0) { setText(""); if (onImported) onImported(data); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit}>
    <p className="admin-note">Impor soal dari berkas atau tempel JSON. Kolom <strong>sourceUrl</strong>, <strong>sourceTitle</strong>, dan <strong>explanation</strong> bersifat opsional. Hanya <code>category</code>, <code>prompt</code>, <code>options</code> (4), dan <code>correctIndex</code> (0–3) yang wajib.</p>
    <div className="field"><label htmlFor="importFile">Berkas JSON (.json)</label><input id="importFile" type="file" accept=".json,application/json" onChange={handleFile} /></div>
    <div className="field"><label htmlFor="importText">Atau tempel JSON</label><textarea id="importText" value={text} onChange={(event) => setText(event.target.value)} rows={10} spellCheck={false} placeholder={EXAMPLE} /></div>
    <details className="diagnostic-details"><summary>Contoh skema JSON</summary><pre>{EXAMPLE}</pre></details>
    {error && <div className="form-message" role="alert">{error}</div>}
    {result && <div className={`form-message ${result.created > 0 ? "form-success" : ""}`} role="status">
      <div>{result.created} soal berhasil diimpor{result.skippedCount ? `, ${result.skippedCount} dilewati` : "."}</div>
      {result.skipped?.length > 0 && <details className="diagnostic-details"><summary>Alasan soal dilewati</summary><pre>{JSON.stringify(result.skipped, null, 2)}</pre></details>}
    </div>}
    <div className="user-actions"><button className="button small" disabled={busy || !text.trim()}>{busy ? "Mengimpor…" : "Impor soal"}</button><button className="button small secondary" type="button" onClick={onClose}>Tutup</button></div>
  </form>;
}
