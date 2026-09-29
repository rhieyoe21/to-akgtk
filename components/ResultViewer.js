"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultViewer({ attemptId, donationUrl, donationMessage }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showThanks, setShowThanks] = useState(false);
  const router = useRouter();
  useEffect(() => {
    // Session storage is only available after hydration; use it for the one-time thank-you dialog.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sessionStorage.getItem("akgtk-just-submitted")) { setShowThanks(true); sessionStorage.removeItem("akgtk-just-submitted"); }
    fetch(`/api/results/${attemptId}`).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Hasil tidak ditemukan."); return data; }).then((data) => setResult(data.attempt)).catch((err) => setError(err.message));
  }, [attemptId]);

  if (error) return <main className="page-main"><div className="shell panel panel-pad"><div className="form-message">{error}</div><Link className="button" href="/dashboard">Kembali ke dashboard</Link></div></main>;
  if (!result) return <main className="page-main"><div className="shell panel loading">Memuat evaluasi…</div></main>;
  const modeLabel = result.mode === "FULL" ? "Tryout penuh" : "Tryout singkat";
  return <main className="page-main"><div className="shell">
    <div className="page-heading"><div><div className="eyebrow">Evaluasi tryout</div><h1>Belajar dari hasil Anda.</h1><p>{modeLabel} · dikumpulkan {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(result.submittedAt))}</p>{result.user && <p>Peserta: {result.user.name} · {result.user.school}</p>}</div><div className="user-actions"><Link className="button secondary" href="/history">Riwayat</Link><Link className="button" href="/dashboard">Dashboard</Link></div></div>
    <section className="result-score"><strong>{result.score}%</strong><div><b>{result.correct} jawaban benar dari {result.total} soal</b><p>Nilai ini membantu melihat bagian yang dapat dipelajari lebih lanjut.</p></div></section>
    <section className="breakdown-grid" aria-label="Rincian per kompetensi">{result.breakdown.map((item) => <div className="breakdown-card" key={item.category}><span>{item.category}</span><strong>{item.correct} / {item.total}</strong></div>)}</section>
    <section className="panel panel-pad"><div className="section-head" style={{ marginBottom: 7 }}><h2 style={{ fontSize: 28 }}>Ulasan jawaban</h2><p>{result.hideSources ? "Setiap soal dilengkapi kunci jawaban." : "Setiap soal dilengkapi kunci dan sumber rujukan."}</p></div>{result.items.map((item) => <article className="review-item" key={item.id}><div className="review-head"><span>Soal {item.position} · {item.category}</span><span>{item.selectedIndex === item.correctIndex ? "Benar" : item.selectedIndex === null ? "Belum dijawab" : "Belum tepat"}</span></div><h3>{item.prompt}</h3><div>{item.options.map((option, index) => <div key={`${item.id}-${index}`} className={`review-option ${index === item.correctIndex ? "correct" : index === item.selectedIndex ? "wrong" : ""}`}><strong>{String.fromCharCode(65 + index)}.</strong><span>{option}{index === item.correctIndex ? " · Kunci jawaban" : index === item.selectedIndex ? " · Jawaban Anda" : ""}</span></div>)}</div>{item.explanation && <p className="review-explanation">{item.explanation}</p>}{item.sourceUrl && !(result.hideSources || item.hideSource) && <div className="review-source"><strong>Sumber: </strong><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceTitle || item.sourceUrl}</a></div>}</article>)}</section>
    {showThanks && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="thanks-title"><div className="eyebrow">Terima kasih</div><h2 id="thanks-title">Terima kasih sudah berlatih bersama.</h2><p>{donationMessage || "Semoga latihan ini bermanfaat untuk perjalanan belajar Anda."}</p><div className="modal-actions">{donationUrl && <a className="button secondary" href={donationUrl} target="_blank" rel="noreferrer">Dukung dengan donasi</a>}<button className="button" onClick={() => setShowThanks(false)}>Lihat evaluasi</button></div></section></div>}
  </div></main>;
}
