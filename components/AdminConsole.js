"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, DIFFICULTIES, DIFFICULTY_LABELS, MODES } from "@/lib/constants";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import QuestionImport from "@/components/QuestionImport";

async function api(url, options) {
  let res;
  try { res = await fetch(url, options); }
  catch { throw new Error("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."); }
  const text = await res.text().catch(() => "");
  if (!text.trim()) throw new Error(`Server tidak mengirim respons (HTTP ${res.status}). Coba lagi; bila berulang, periksa log server.`);
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Server mengirim respons yang tidak valid (HTTP ${res.status}). Coba lagi; bila berulang, periksa log server.`); }
  if (!data || typeof data !== "object") throw new Error(`Format respons server tidak valid (HTTP ${res.status}).`);
  if (!res.ok) {
    const error = new Error(data.error || `Permintaan gagal (HTTP ${res.status}).`);
    error.details = data.details || null;
    throw error;
  }
  return data;
}

const MAX_BULK = 10000;

function notifyAdminChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("akgtk-admin-changed"));
}

async function fetchTablePage(tab, page, category, search, status, difficulty) {
  const params = new URLSearchParams({ page: String(page) });
  if (tab === "questions") {
    if (category) params.set("category", category);
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (difficulty) params.set("difficulty", difficulty);
    return api(`/api/admin/questions?${params}`);
  }
  if (tab === "users") {
    if (search) params.set("q", search);
    return api(`/api/admin/users?${params}`);
  }
  return api(`/api/admin/results?${params}`);
}

function paginationMeta(data) {
  return { page: data.page, pageSize: data.pageSize, total: data.total, totalPages: data.totalPages };
}

function QuestionForm({ question, onSave, onCancel }) {
  const initialOptions = question?.options || ["", "", "", ""];
  const [options, setOptions] = useState([...initialOptions, "", "", "", ""].slice(0, 4));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      category: form.get("category"), prompt: form.get("prompt"), options,
      correctIndex: Number(form.get("correctIndex")), explanation: form.get("explanation"),
      sourceUrl: form.get("sourceUrl"), sourceTitle: form.get("sourceTitle"), isActive: form.get("isActive") === "on",
      difficulty: form.get("difficulty")
    };
    try {
      if (question) await api(`/api/admin/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      else await api("/api/admin/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      onSave();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form className="edit-box" onSubmit={submit}><div className="edit-grid">
    <div className="field"><label>Kompetensi</label><select name="category" defaultValue={question?.category || CATEGORIES[0]}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="field"><label>Kesulitan</label><select name="difficulty" defaultValue={question?.difficulty || "sedang"}>{DIFFICULTIES.filter((item) => item !== "campuran").map((item) => <option key={item} value={item}>{DIFFICULTY_LABELS[item]}</option>)}</select></div>
    <div className="field"><label>Kunci jawaban</label><select name="correctIndex" defaultValue={question?.correctIndex ?? 0}>{options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></div>
    <div className="field wide"><label>Teks soal</label><textarea name="prompt" defaultValue={question?.prompt || ""} required minLength="10" maxLength="5000" /></div>
    {options.map((option, index) => <div className="field" key={index}><label>Opsi {String.fromCharCode(65 + index)}</label><input value={option} onChange={(event) => setOptions((old) => old.map((item, optionIndex) => optionIndex === index ? event.target.value : item))} required maxLength="1000" /></div>)}
    <div className="field"><label>URL sumber (opsional)</label><input name="sourceUrl" type="url" defaultValue={question?.sourceUrl || ""} /></div>
    <div className="field"><label>Judul sumber</label><input name="sourceTitle" defaultValue={question?.sourceTitle || ""} maxLength="500" /></div>
    <div className="field wide"><label>Pembahasan</label><textarea name="explanation" defaultValue={question?.explanation || ""} maxLength="3000" /></div>
    <div className="field wide"><label><input name="isActive" type="checkbox" defaultChecked={question?.isActive ?? true} /> Aktif untuk tryout</label></div>
  </div>{error && <div role="alert" className="form-message">{error}</div>}<div className="user-actions"><button className="button small" disabled={busy}>{busy ? "Menyimpan…" : "Simpan soal"}</button><button className="button small secondary" type="button" onClick={onCancel}>Batal</button></div></form>;
}

function PageIcon({ kind }) {
  const paths = {
    first: <><path d="m11 5-7 7 7 7M20 5l-7 7 7 7" /><path d="M2 4v16" /></>,
    previous: <path d="m15 5-7 7 7 7" />,
    next: <path d="m9 5 7 7-7 7" />,
    last: <><path d="m13 5 7 7-7 7M4 5l7 7-7 7" /><path d="M22 4v16" /></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function TablePagination({ info, onPageChange }) {
  const page = info?.page || 1;
  const totalPages = info?.totalPages || 1;
  const pageSize = info?.pageSize || 20;
  const total = info?.total || 0;
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const controls = [
    { kind: "first", label: "Halaman pertama", target: 1, disabled: page <= 1 },
    { kind: "previous", label: "Halaman sebelumnya", target: page - 1, disabled: page <= 1 },
    { kind: "next", label: "Halaman berikutnya", target: page + 1, disabled: page >= totalPages },
    { kind: "last", label: "Halaman terakhir", target: totalPages, disabled: page >= totalPages }
  ];
  return <nav className="table-pagination" aria-label="Navigasi halaman tabel">
    <span className="pagination-range" aria-live="polite">Menampilkan {start}–{end} dari {total}</span>
    <div className="pagination-controls"><span className="pagination-page">Halaman {page} dari {totalPages}</span>{controls.map((control) => <button key={control.kind} className="pagination-icon" type="button" aria-label={control.label} title={control.label} disabled={control.disabled} onClick={() => onPageChange(control.target)}><PageIcon kind={control.kind} /></button>)}</div>
  </nav>;
}

export default function AdminConsole() {
  const [tab, setTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tablePages, setTablePages] = useState({ questions: 1, users: 1, results: 1 });
  const [pageInfo, setPageInfo] = useState({
    questions: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    users: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    results: { page: 1, pageSize: 20, total: 0, totalPages: 1 }
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [questionStatus, setQuestionStatus] = useState("active");
  const [questionDifficulty, setQuestionDifficulty] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeDetails, setNoticeDetails] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSettings, setAiSettings] = useState({ maxQuestionsPerRequest: 20, requestsPerHour: 8, sourceAuditEnabled: true, sourceEvidenceCheck: false, hideSources: false });
  const [aiSettingsDraft, setAiSettingsDraft] = useState({ maxQuestionsPerRequest: 20, requestsPerHour: 8, sourceAuditEnabled: true, sourceEvidenceCheck: false, hideSources: false });
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const load = useCallback(async (selected = tab) => {
    try {
      if (selected === "account") return;
      if (selected === "settings") {
        const data = await api("/api/admin/settings/ai-generation");
        setAiSettings(data.settings);
        setAiSettingsDraft(data.settings);
        return;
      }
      const data = await fetchTablePage(selected, tablePages[selected], category, search, questionStatus, questionDifficulty);
      if (selected === "questions") {
        setQuestions(data.questions); setPageInfo((old) => ({ ...old, questions: paginationMeta(data) }));
      } else if (selected === "users") {
        setUsers(data.users); setPageInfo((old) => ({ ...old, users: paginationMeta(data) }));
      } else {
        setAttempts(data.attempts); setPageInfo((old) => ({ ...old, results: paginationMeta(data) }));
      }
      if (data.page !== tablePages[selected]) setTablePages((old) => ({ ...old, [selected]: data.page }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [tab, category, search, questionStatus, questionDifficulty, tablePages]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        if (tab === "account") { if (active) setLoading(false); return; }
        if (tab === "settings") {
          const data = await api("/api/admin/settings/ai-generation");
          if (active) { setAiSettings(data.settings); setAiSettingsDraft(data.settings); }
          return;
        }
        const data = await fetchTablePage(tab, tablePages[tab], category, search, questionStatus, questionDifficulty);
        if (!active) return;
        if (tab === "questions") setQuestions(data.questions);
        else if (tab === "users") setUsers(data.users);
        else setAttempts(data.attempts);
        setPageInfo((old) => ({ ...old, [tab]: paginationMeta(data) }));
        if (data.page !== tablePages[tab]) setTablePages((old) => ({ ...old, [tab]: data.page }));
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    }
    refresh();
    return () => { active = false; };
  }, [tab, category, search, questionStatus, questionDifficulty, tablePages]);

  useEffect(() => {
    let active = true;
    api("/api/admin/settings/ai-generation").then((data) => {
      if (active) { setAiSettings(data.settings); setAiSettingsDraft(data.settings); }
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  async function toggleQuestion(question) {
    try { await api(`/api/admin/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !question.isActive }) }); await load(); notifyAdminChanged(); }
    catch (err) { setError(err.message); }
  }
  async function toggleQuestionHideSource(question, hideSource) {
    try {
      await api(`/api/admin/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hideSource }) });
      await load("questions");
    } catch (err) { setError(err.message); }
  }
  async function setSelectedQuestionsHideSource(hideSource) {
    const ids = selectedQuestionIds;
    if (!ids.length || ids.length > MAX_BULK) return;
    setLoading(true); setError("");
    try {
      const data = await api("/api/admin/questions/bulk-source", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, hideSource }) });
      setNotice(`${data.updated} soal diperbarui: sumber ${hideSource ? "disembunyikan" : "ditampilkan"} di evaluasi.`);
      setSelectedQuestionIds([]);
      await load("questions");
    } catch (err) { setError(err.message); setLoading(false); }
  }
  async function selectAllQuestions() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("q", search);
      if (questionStatus) params.set("status", questionStatus);
      if (questionDifficulty) params.set("difficulty", questionDifficulty);
      const data = await api(`/api/admin/questions/ids?${params}`);
      setSelectedQuestionIds(data.ids);
      if (data.capped) setNotice("Pilihan dibatasi pada 10.000 soal pertama sesuai filter.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  function toggleQuestionSelection(id, checked) {
    setSelectedQuestionIds((selected) => checked ? [...new Set([...selected, id])] : selected.filter((item) => item !== id));
  }
  function toggleAllDisplayedQuestions(checked) {
    setSelectedQuestionIds((selected) => {
      if (!checked) return selected.filter((id) => !questions.some((question) => question.id === id));
      return [...new Set([...selected, ...questions.map((question) => question.id)])];
    });
  }
  async function deleteQuestion(question) {
    if (!window.confirm("Hapus soal ini secara permanen? Evaluasi tryout yang sudah selesai tetap tersimpan.")) return;
    setError("");
    try {
      await api(`/api/admin/questions/${question.id}`, { method: "DELETE" });
      setSelectedQuestionIds((selected) => selected.filter((id) => id !== question.id));
      setNotice("Soal berhasil dihapus.");
      await load("questions"); notifyAdminChanged();
    } catch (err) { setError(err.message); }
  }
  async function deleteSelectedQuestions() {
    const ids = selectedQuestionIds;
    if (!ids.length || ids.length > MAX_BULK) return;
    if (!window.confirm(`Hapus permanen ${ids.length} soal yang dipilih? Evaluasi tryout yang sudah selesai tetap tersimpan.`)) return;
    setLoading(true); setError("");
    try {
      const data = await api("/api/admin/questions/bulk-delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      setNotice(`${data.deleted} soal berhasil dihapus.`);
      setSelectedQuestionIds([]);
      await load("questions"); notifyAdminChanged();
    } catch (err) { setError(err.message); setLoading(false); }
  }
  async function setSelectedQuestionsActive(isActive) {
    const ids = selectedQuestionIds;
    if (!ids.length || ids.length > MAX_BULK) return;
    if (!window.confirm(`Yakin ${isActive ? "mengaktifkan" : "menonaktifkan"} ${ids.length} soal yang dipilih?`)) return;
    setLoading(true); setError("");
    try {
      const data = await api("/api/admin/questions/bulk-status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, isActive }) });
      setNotice(`${data.updated} soal berhasil ${isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      setSelectedQuestionIds([]);
      await load("questions"); notifyAdminChanged();
    } catch (err) { setError(err.message); setLoading(false); }
  }
  async function toggleUser(user) {
    try { await api("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, isActive: !user.isActive }) }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function resetUser(user) {
    if (!window.confirm(`Buat password sementara baru untuk ${user.name}?`)) return;
    try { const data = await api("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) }); setTempPassword(`${user.name}: ${data.temporaryPassword}`); }
    catch (err) { setError(err.message); }
  }
  async function generate(event) {
    event.preventDefault(); setGenerating(true); setError(""); setErrorDetails(null); setNotice(""); setNoticeDetails(null);
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/admin/questions/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: form.get("category"), quantity: Number(form.get("quantity")), focus: form.get("focus"), difficulty: form.get("difficulty"), useGoogleSearch: form.get("useGoogleSearch") === "on" }) });
      const skippedCount = data.skippedCount || 0;
      const groundingNote = data.groundingUnavailable ? " Google Search tidak menyediakan sitasi, sehingga sumber diverifikasi lewat audit tautan langsung." : "";
      setNotice((skippedCount > 0
        ? `${data.created} soal tersimpan. ${skippedCount} soal dilewati karena sumber tidak valid atau tidak dapat diverifikasi.`
        : `${data.created} soal tersimpan langsung di bank soal.`) + groundingNote);
      setNoticeDetails(skippedCount > 0 ? data.skipped : null);
      setErrorDetails(null); setShowGenerate(false); await load(); notifyAdminChanged();
    } catch (err) { setError(err.message); setErrorDetails(err.details || null); }
    finally { setGenerating(false); }
  }

  async function saveAiSettings(event) {
    event.preventDefault(); setSavingAiSettings(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/admin/settings/ai-generation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxQuestionsPerRequest: Number(form.get("maxQuestionsPerRequest")),
          requestsPerHour: Number(form.get("requestsPerHour")),
          sourceAuditEnabled: form.get("sourceAuditEnabled") === "on",
          sourceEvidenceCheck: form.get("sourceEvidenceCheck") === "on",
          hideSources: form.get("hideSources") === "on",
          donationMessage: form.get("donationMessage"),
          donationUrl: form.get("donationUrl")
        })
      });
      setAiSettings(data.settings);
      setAiSettingsDraft(data.settings);
      setNotice("Pengaturan berhasil diperbarui.");
    } catch (err) { setError(err.message); }
    finally { setSavingAiSettings(false); }
  }

  function changePage(table, nextPage) {
    const lastPage = pageInfo[table]?.totalPages || 1;
    const page = Math.max(1, Math.min(lastPage, nextPage));
    if (page === tablePages[table]) return;
    setLoading(true);
    setTablePages((old) => ({ ...old, [table]: page }));
  }

  return <section className="panel panel-pad">
    <div className="admin-tabs" role="tablist" aria-label="Pengelolaan admin">
      {[ ["questions", "Bank soal"], ["users", "Peserta"], ["results", "Hasil tryout"], ["settings", "Pengaturan"], ["account", "Ubah password"] ].map(([id, label]) => <button key={id} className="tab-button" role="tab" aria-selected={tab === id} onClick={() => { setLoading(true); setTab(id); setSearch(""); setTablePages((old) => ({ ...old, [id]: 1 })); if (id === "questions") setSelectedQuestionIds([]); setError(""); setErrorDetails(null); setNotice(""); }}>{label}</button>)}
    </div>
    {error && <div className="form-message" role="alert"><div>{error}</div>{errorDetails && <details className="diagnostic-details"><summary>Log diagnostik Gemini</summary><pre>{JSON.stringify(errorDetails, null, 2)}</pre></details>}</div>}{notice && <div className="form-message form-success" role="status"><div>{notice}</div>{noticeDetails && <details className="diagnostic-details"><summary>Alasan soal dilewati</summary><pre>{JSON.stringify(noticeDetails, null, 2)}</pre></details>}</div>}

    {tab === "questions" && <>
      <div className="admin-toolbar"><div><h2>Bank soal</h2><span className="admin-note">{questions.length} soal ditampilkan · {selectedQuestionIds.length} dipilih dari {pageInfo.questions.total} yang cocok</span></div><div className="user-actions">{(pageInfo.questions.total || 0) > questions.length && selectedQuestionIds.length < pageInfo.questions.total && <button className="button secondary small" disabled={loading} onClick={selectAllQuestions}>Pilih semua ({pageInfo.questions.total})</button>}{selectedQuestionIds.length > 0 && <button className="button ghost small" onClick={() => setSelectedQuestionIds([])}>Batal pilih</button>}{selectedQuestionIds.length > 0 && <><button className="button secondary small" disabled={loading || selectedQuestionIds.length > MAX_BULK} onClick={() => setSelectedQuestionsActive(false)}>Nonaktifkan terpilih</button><button className="button secondary small" disabled={loading || selectedQuestionIds.length > MAX_BULK} onClick={() => setSelectedQuestionsActive(true)}>Aktifkan terpilih</button><button className="button secondary small" disabled={loading || selectedQuestionIds.length > MAX_BULK} onClick={() => setSelectedQuestionsHideSource(true)}>Sembunyikan sumber</button><button className="button secondary small" disabled={loading || selectedQuestionIds.length > MAX_BULK} onClick={() => setSelectedQuestionsHideSource(false)}>Tampilkan sumber</button><button className="button danger small" disabled={loading || selectedQuestionIds.length > MAX_BULK} onClick={deleteSelectedQuestions}>Hapus terpilih ({selectedQuestionIds.length})</button></>}<button className="button secondary small" onClick={() => { setShowCreate(!showCreate); setEditing(null); }}>Tambah manual</button><button className="button secondary small" onClick={() => setShowImport(true)}>Impor JSON</button><button className="button small" onClick={() => setShowGenerate(!showGenerate)}>Buat dengan AI</button></div></div>
      {showGenerate && <form className="edit-box" onSubmit={generate}><div className="edit-grid"><div className="field"><label>Kompetensi</label><select name="category" required>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label>Tingkat kesulitan</label><select name="difficulty" defaultValue="sedang">{DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABELS[item]}</option>)}</select></div><div className="field"><label>Jumlah soal (maks. {aiSettings.maxQuestionsPerRequest})</label><input name="quantity" type="number" min="1" max={aiSettings.maxQuestionsPerRequest} defaultValue={Math.min(5, aiSettings.maxQuestionsPerRequest)} required /></div><div className="field wide"><label>Fokus/topik tambahan (opsional)</label><input name="focus" maxLength="500" placeholder="Contoh: perencanaan berbasis data madrasah" /></div><div className="field wide"><label htmlFor="useGoogleSearch"><input id="useGoogleSearch" name="useGoogleSearch" type="checkbox" /> Gunakan Google Search grounding</label><span className="field-help">Gemini mencari sumber web dan URL soal harus cocok dengan sitasi hasil pencarian. Dapat menambah penggunaan/biaya API. Jika Google tidak memberikan sitasi, sumber tetap divalidasi lewat audit tautan.</span></div></div><p className="admin-note">Sumber divalidasi otomatis lewat audit tautan langsung (bukan homepage, bukan 404, isi relevan). Bila diaktifkan di Pengaturan AI, Gemini juga memverifikasi bukti isi halaman. Soal yang lolos langsung aktif; soal yang gagal dilewati beserta alasannya.</p><button className="button small" disabled={generating}>{generating ? "Gemini sedang membuat soal…" : "Generate dan simpan"}</button></form>}

       <div className="admin-toolbar"><div className="inline-form"><select aria-label="Filter kompetensi" value={category} onChange={(event) => { setCategory(event.target.value); setTablePages((old) => ({ ...old, questions: 1 })); setSelectedQuestionIds([]); setLoading(true); }}><option value="">Semua kompetensi</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter status soal" value={questionStatus} onChange={(event) => { setQuestionStatus(event.target.value); setTablePages((old) => ({ ...old, questions: 1 })); setSelectedQuestionIds([]); setLoading(true); }}><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><select aria-label="Filter kesulitan" value={questionDifficulty} onChange={(event) => { setQuestionDifficulty(event.target.value); setTablePages((old) => ({ ...old, questions: 1 })); setSelectedQuestionIds([]); setLoading(true); }}><option value="">Semua kesulitan</option>{DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABELS[item]}</option>)}</select><input aria-label="Cari soal" value={search} onChange={(event) => { setSearch(event.target.value); setTablePages((old) => ({ ...old, questions: 1 })); setSelectedQuestionIds([]); setLoading(true); }} placeholder="Cari teks soal" /></div><button className="button secondary small" onClick={() => { setTablePages((old) => ({ ...old, questions: 1 })); setLoading(true); }}>Cari</button></div>
      {(showCreate || editing) && <div className="modal-backdrop"><section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="question-modal-title"><div className="modal-head"><h2 id="question-modal-title">{editing ? "Edit soal" : "Tambah soal"}</h2><button className="button ghost small" type="button" onClick={() => { setEditing(null); setShowCreate(false); }}>Tutup</button></div><QuestionForm key={editing?.id || "new"} question={editing || undefined} onSave={async () => { const wasEditing = Boolean(editing); setEditing(null); setShowCreate(false); setNotice(wasEditing ? "Perubahan soal tersimpan." : "Soal manual tersimpan."); await load(); notifyAdminChanged(); }} onCancel={() => { setEditing(null); setShowCreate(false); }} /></section></div>}
      {showImport && <div className="modal-backdrop"><section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="import-modal-title"><div className="modal-head"><h2 id="import-modal-title">Impor soal JSON</h2><button className="button ghost small" type="button" onClick={() => setShowImport(false)}>Tutup</button></div><QuestionImport onImported={async () => { setNotice("Impor selesai."); await load("questions"); notifyAdminChanged(); }} onClose={() => setShowImport(false)} /></section></div>}
      {loading ? <div className="loading">Memuat bank soal…</div> : <>
        <div className="table-wrap"><table><thead><tr>
          <th><input type="checkbox" aria-label={`Pilih semua ${questions.length} soal yang ditampilkan`} checked={questions.length > 0 && questions.every((question) => selectedQuestionIds.includes(question.id))} onChange={(event) => toggleAllDisplayedQuestions(event.target.checked)} /></th>
          <th>Soal</th><th>Kompetensi</th><th>Kesulitan</th><th>Status</th><th>Sumber di evaluasi</th><th>Tindakan</th>
        </tr></thead><tbody>{questions.map((question) => <tr key={question.id}>
          <td><input type="checkbox" aria-label={`Pilih soal: ${question.prompt}`} checked={selectedQuestionIds.includes(question.id)} onChange={(event) => toggleQuestionSelection(question.id, event.target.checked)} /></td>
          <td><div className="question-snippet"><strong>{question.prompt}</strong><p>{question.sourceUrl ? <a className="text-link" target="_blank" rel="noreferrer" href={question.sourceUrl}>{question.sourceTitle || question.sourceUrl}</a> : <span className="admin-note">Tanpa sumber</span>} · {question.generatedByAI ? "Dibuat AI" : "Manual"}</p></div></td>
          <td>{question.category}</td>
          <td><span className={`status difficulty-${question.difficulty || "sedang"}`}>{DIFFICULTY_LABELS[question.difficulty] || "Sedang"}</span></td>
          <td><span className={`status ${question.isActive ? "" : "off"}`}>{question.isActive ? "Aktif" : "Nonaktif"}</span></td>
          <td><label className="source-toggle" title="Sembunyikan sumber soal ini di halaman evaluasi"><input type="checkbox" aria-label={`Sembunyikan sumber di evaluasi untuk soal: ${question.prompt}`} checked={Boolean(question.hideSource)} onChange={(event) => toggleQuestionHideSource(question, event.target.checked)} /> <span>{question.hideSource ? "Disembunyikan" : "Tampil"}</span></label></td>
          <td><div className="user-actions"><button className="button secondary small" onClick={() => { setEditing(question); setShowCreate(false); }}>Edit</button><button className="button secondary small" onClick={() => toggleQuestion(question)}>{question.isActive ? "Nonaktifkan" : "Aktifkan"}</button><button className="button danger small" onClick={() => deleteQuestion(question)}>Hapus</button></div></td>
        </tr>)}</tbody></table>{!questions.length && !loading && <div className="empty-state"><strong>Bank soal masih kosong</strong>Buat soal dengan Gemini atau tambahkan soal secara manual.</div>}</div>
        {selectedQuestionIds.length > MAX_BULK && <p className="form-message" role="alert">Pilih maksimal {MAX_BULK} soal dalam satu aksi batch.</p>}
         <TablePagination info={pageInfo.questions} onPageChange={(page) => changePage("questions", page)} />
      </>}
    </>}

    {tab === "users" && <><div className="admin-toolbar"><div><h2>Peserta</h2><span className="admin-note">Kelola akses dan bantu pemulihan akun.</span></div><div className="inline-form"><input aria-label="Cari peserta" value={search} onChange={(event) => { setSearch(event.target.value); setTablePages((old) => ({ ...old, users: 1 })); setLoading(true); }} placeholder="Nama, email, sekolah" /><button className="button secondary small" onClick={() => { setTablePages((old) => ({ ...old, users: 1 })); setLoading(true); }}>Cari</button></div></div>{tempPassword && <div className="form-message form-success" role="status">Password sementara dibuat. Sampaikan kepada peserta melalui kanal pribadi: <strong>{tempPassword}</strong><button className="button ghost small" onClick={() => setTempPassword("")}>Tutup</button></div>}{loading ? <div className="loading">Memuat peserta…</div> : <><div className="table-wrap"><table><thead><tr><th>Peserta</th><th>Sekolah</th><th>Tryout</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><br /><span className="admin-note">{user.email}</span></td><td>{user.school}</td><td>{user._count.attempts}</td><td><span className={`status ${user.isActive ? "" : "off"}`}>{user.isActive ? "Aktif" : "Dinonaktifkan"}</span></td><td><div className="user-actions"><button className="button secondary small" onClick={() => toggleUser(user)}>{user.isActive ? "Nonaktifkan" : "Aktifkan"}</button><button className="button secondary small" onClick={() => resetUser(user)}>Reset password</button></div></td></tr>)}</tbody></table>{!users.length && <div className="empty-state"><strong>Belum ada peserta</strong>Peserta yang mendaftar akan muncul di sini.</div>}</div><TablePagination info={pageInfo.users} onPageChange={(page) => changePage("users", page)} /></>}</>}

    {tab === "results" && <><div className="admin-toolbar"><div><h2>Hasil tryout</h2><span className="admin-note">Percobaan terbaru peserta.</span></div><button className="button secondary small" onClick={() => load()}>Muat ulang</button></div>{loading ? <div className="loading">Memuat hasil…</div> : <><div className="table-wrap"><table><thead><tr><th>Peserta</th><th>Mode</th><th>Nilai</th><th>Dikerjakan</th><th></th></tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id}><td><strong>{attempt.user.name}</strong><br /><span className="admin-note">{attempt.user.school}</span></td><td>{MODES[attempt.mode]?.label || attempt.mode}</td><td><span className="score-pill">{attempt.score}%</span></td><td>{attempt.submittedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(attempt.submittedAt)) : "—"}</td><td><Link className="text-link" href={`/results/${attempt.id}`}>Buka evaluasi</Link></td></tr>)}</tbody></table>{!attempts.length && <div className="empty-state"><strong>Belum ada hasil</strong>Hasil yang telah dikumpulkan akan muncul di sini.</div>}</div><TablePagination info={pageInfo.results} onPageChange={(page) => changePage("results", page)} /></>}</>}

    {tab === "settings" && <section className="panel panel-pad"><div className="admin-toolbar"><div><h2>Pengaturan</h2><p className="admin-note">Perubahan berlaku langsung tanpa restart. Batas maksimum mutlak adalah 50 soal per batch dan 100 permintaan per jam.</p></div></div><form className="edit-box" onSubmit={saveAiSettings}><div className="edit-grid"><div className="field"><label htmlFor="maxQuestionsPerRequest">Maksimal soal per batch</label><input id="maxQuestionsPerRequest" name="maxQuestionsPerRequest" type="number" min="1" max="50" required value={aiSettingsDraft.maxQuestionsPerRequest} onChange={(event) => setAiSettingsDraft((old) => ({ ...old, maxQuestionsPerRequest: event.target.value === "" ? "" : Number(event.target.value) }))} /><span className="field-help">Batas tersimpan saat ini: {aiSettings.maxQuestionsPerRequest} soal per permintaan.</span></div><div className="field"><label htmlFor="requestsPerHour">Batas generate per admin per jam</label><input id="requestsPerHour" name="requestsPerHour" type="number" min="1" max="100" required value={aiSettingsDraft.requestsPerHour} onChange={(event) => setAiSettingsDraft((old) => ({ ...old, requestsPerHour: event.target.value === "" ? "" : Number(event.target.value) }))} /><span className="field-help">Batas tersimpan saat ini: {aiSettings.requestsPerHour} percobaan per jam untuk akun admin dan alamat jaringan.</span></div><div className="field wide"><label htmlFor="sourceAuditEnabled"><input id="sourceAuditEnabled" name="sourceAuditEnabled" type="checkbox" defaultChecked={aiSettings.sourceAuditEnabled !== false} /> Audit tautan sumber (HTTP) sebelum soal disimpan</label><span className="field-help">Memeriksa tautan langsung dapat diakses, bukan homepage, bukan 404 lunak, dan isinya cukup relevan. Tidak memakai kuota Gemini.</span></div><div className="field wide"><label htmlFor="sourceEvidenceCheck"><input id="sourceEvidenceCheck" name="sourceEvidenceCheck" type="checkbox" defaultChecked={aiSettings.sourceEvidenceCheck === true} /> Verifikasi bukti isi halaman dengan Gemini (opsional)</label><span className="field-help">Mengirim kutipan halaman ke Gemini untuk memastikan sumber benar-benar mendukung soal. Menambah pemakaian kuota API.</span></div><div className="field wide"><label htmlFor="hideSources"><input id="hideSources" name="hideSources" type="checkbox" defaultChecked={aiSettings.hideSources === true} /> Sembunyikan semua sumber di halaman evaluasi</label><span className="field-help">Menyembunyikan tautan sumber pada evaluasi/hasil untuk semua soal. Pengaturan per soal tetap dapat diatur lewat toggle di baris bank soal.</span></div><div className="field wide"><label htmlFor="donationMessage">Pesan donasi</label><input id="donationMessage" name="donationMessage" defaultValue={aiSettings.donationMessage || ""} maxLength="500" placeholder="Jika aplikasi ini bermanfaat, dukung pengembangannya melalui donasi." /><span className="field-help">Tampil pada dialog setelah tryout dikumpulkan.</span></div><div className="field wide"><label htmlFor="donationUrl">URL donasi (opsional)</label><input id="donationUrl" name="donationUrl" type="url" defaultValue={aiSettings.donationUrl || ""} maxLength="500" placeholder="https://..." /><span className="field-help">Tombol donasi tampil bila URL diisi.</span></div></div><button className="button" disabled={savingAiSettings}>{savingAiSettings ? "Menyimpan…" : "Simpan pengaturan"}</button></form></section>}

    {tab === "account" && <section className="panel panel-pad"><div className="admin-toolbar"><div><h2>Ubah password</h2><p className="admin-note">Ganti password akun admin Anda. Sesi lain akan dikeluarkan.</p></div></div><ChangePasswordForm /></section>}
  </section>;
}
