"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LETTERS = ["A", "B", "C", "D"];

function saveAnswer(attemptId, itemId, selectedIndex, keepalive = false) {
  return fetch(`/api/attempts/${attemptId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, selectedIndex }),
    keepalive
  });
}

export default function TryoutRunner({ attemptId }) {
  const [attempt, setAttempt] = useState(null);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const saveQueue = useRef(Promise.resolve());
  const autoSubmitted = useRef(false);
  const deadlineRef = useRef(null);
  const lastAnswerRef = useRef(null);

  const computeRemaining = useCallback(() => {
    if (deadlineRef.current === null) return null;
    return Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attemptId}`, { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (data.expired) { router.replace(`/results/${attemptId}`); return null; }
      if (data.completed) { router.replace(data.resultUrl); return null; }
      if (!res.ok) throw new Error(data.error || "Tryout tidak dapat dibuka.");
      return data.attempt;
    }).then((data) => {
      if (!data || cancelled) return;
      setAttempt(data);
      if (data.timed) {
        const deadline = new Date(data.startedAt).getTime() + data.durationSec * 1000;
        deadlineRef.current = deadline;
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      } else {
        deadlineRef.current = null;
        setRemaining(null);
      }
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [attemptId, router]);

  const finish = useCallback(async (automatic = false) => {
    if (submitting || autoSubmitted.current) return;
    if (automatic) autoSubmitted.current = true;
    setSubmitting(true); setError("");
    try {
      await saveQueue.current;
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Jawaban belum dapat dikumpulkan.");
      sessionStorage.setItem("akgtk-just-submitted", "1");
      router.replace(data.resultUrl);
    } catch (err) { setError(err.message); setSubmitting(false); autoSubmitted.current = false; }
  }, [attemptId, router, submitting]);

  useEffect(() => {
    if (!attempt || !attempt.timed) return undefined;
    const tick = () => {
      const next = computeRemaining();
      setRemaining(next);
      if (next === 0) finish(true);
    };
    const interval = window.setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [attempt, computeRemaining, finish]);

  useEffect(() => {
    const flush = () => {
      const pending = lastAnswerRef.current;
      if (!pending) return;
      saveAnswer(attemptId, pending.itemId, pending.selectedIndex, true).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [attemptId]);

  const item = attempt?.items[current];
  const answered = useMemo(() => new Set(attempt?.items.filter((entry) => entry.selectedIndex !== null).map((entry) => entry.id) || []), [attempt]);

  function chooseAnswer(selectedIndex) {
    if (!item) return;
    const activeItem = item;
    lastAnswerRef.current = { itemId: activeItem.id, selectedIndex };
    setAttempt((old) => ({ ...old, items: old.items.map((entry) => entry.id === activeItem.id ? { ...entry, selectedIndex } : entry) }));
    setSaving(true); setError("");
    const save = async () => {
      const res = await saveAnswer(attemptId, activeItem.id, selectedIndex, true);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Jawaban belum tersimpan.");
    };
    saveQueue.current = saveQueue.current.then(save).catch((err) => { setError(err.message); });
    saveQueue.current.finally(() => setSaving(false));
  }

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  if (error && !attempt) return <main className="page-main"><div className="shell panel panel-pad"><div className="form-message">{error}</div><button className="button" onClick={() => router.push("/dashboard")}>Kembali ke dashboard</button></div></main>;
  if (!attempt || !item) return <main className="page-main"><div className="shell panel loading">Memuat soal…</div></main>;

  return <main className="page-main"><div className="shell">
    <div className="page-heading"><div><div className="eyebrow">{attempt.mode === "FULL" ? "Tryout penuh" : "Tryout singkat"}</div><h1>Kerjakan dengan tenang.</h1><p>Jawaban tersimpan otomatis dan tetap tersimpan meski halaman ditutup. Waktu tetap berjalan selama sesi berlangsung.</p></div></div>
    <div className="quiz-layout"><section className="panel quiz-main">
      <div className="quiz-topline"><span className="quiz-progress">Soal {current + 1} dari {attempt.items.length}</span>{attempt.timed ? <span className={`quiz-timer ${remaining < 300 ? "urgent" : ""}`} aria-live="polite">Sisa {formatTime(remaining ?? 0)}</span> : <span className="quiz-timer">Tanpa batas waktu</span>}</div>
      <div className="quiz-category">{item.category}</div><h2 className="quiz-question">{item.prompt}</h2>
      <div className="answer-list" role="radiogroup" aria-label="Pilihan jawaban">{item.options.map((option, index) => <button key={`${item.id}-${index}`} className={`answer-choice ${item.selectedIndex === index ? "selected" : ""}`} role="radio" aria-checked={item.selectedIndex === index} onClick={() => chooseAnswer(index)}><span className="answer-letter">{LETTERS[index]}</span><span>{option}</span></button>)}</div>
      {error && <div className="form-message" role="alert">{error}</div>}
      <div className="quiz-actions"><button className="button secondary" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Sebelumnya</button><span className="save-indicator" aria-live="polite">{saving ? "Menyimpan jawaban…" : item.selectedIndex === null ? "Soal ini belum dijawab" : "Jawaban tersimpan"}</span>{current < attempt.items.length - 1 ? <button className="button" onClick={() => setCurrent((value) => Math.min(attempt.items.length - 1, value + 1))}>Soal berikutnya</button> : <button className="button" onClick={() => setConfirmSubmit(true)}>Selesai dan kumpulkan</button>}</div>
      {current < attempt.items.length - 1 && <div style={{ textAlign: "right", marginTop: 8 }}><button className="button ghost small" onClick={() => setCurrent((value) => Math.min(attempt.items.length - 1, value + 1))}>Lewati dulu</button></div>}
    </section>
    <aside className="panel quiz-nav"><h3>Navigasi soal</h3><p>{answered.size} sudah dijawab · {attempt.items.length - answered.size} belum dijawab</p><div className="number-grid">{attempt.items.map((entry, index) => <button key={entry.id} className={`number-button ${entry.selectedIndex !== null ? "answered" : ""} ${current === index ? "current" : ""}`} aria-label={`Ke soal ${index + 1}${entry.selectedIndex !== null ? ", sudah dijawab" : ", belum dijawab"}`} aria-current={current === index ? "step" : undefined} onClick={() => setCurrent(index)}>{index + 1}</button>)}</div><div className="legend"><span><i className="filled" /> Sudah dijawab</span><span><i /> Belum dijawab</span></div><button className="button" style={{ width: "100%", marginTop: 17 }} onClick={() => setConfirmSubmit(true)}>Kumpulkan tryout</button></aside></div>
    {confirmSubmit && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title"><h2 id="submit-title">Kumpulkan jawaban?</h2><p>{answered.size} dari {attempt.items.length} soal sudah dijawab. Soal yang belum dijawab akan dihitung salah. Setelah dikumpulkan, jawaban tidak dapat diubah.</p>{error && <div className="form-message">{error}</div>}<div className="modal-actions"><button className="button secondary" onClick={() => setConfirmSubmit(false)} disabled={submitting}>Periksa lagi</button><button className="button" onClick={() => finish(false)} disabled={submitting}>{submitting ? "Mengumpulkan…" : "Ya, kumpulkan"}</button></div></section></div>}
  </div></main>;
}
