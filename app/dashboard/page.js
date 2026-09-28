import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CATEGORIES, MODES } from "@/lib/constants";
import { getActiveAttempt } from "@/lib/attempts";
import { prisma } from "@/lib/db";
import StartTryout from "@/components/StartTryout";
import ActiveSession from "@/components/ActiveSession";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  const [attempts, activeAttempt] = await Promise.all([
    prisma.attempt.findMany({ where: { userId: user.id, status: "SUBMITTED" }, select: { id: true, mode: true, score: true, submittedAt: true }, orderBy: { submittedAt: "desc" }, take: 5 }),
    getActiveAttempt(user.id)
  ]);
  const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + (item.score || 0), 0) / attempts.length) : "—";
  return <main className="page-main"><div className="shell">
    <div className="page-heading"><div><div className="eyebrow">Ruang belajar Anda</div><h1>Halo, {user.name.split(" ")[0]}.</h1><p>Satu latihan pada satu waktu. Progres Anda tersimpan otomatis.</p></div><Link className="button secondary" href="/history">Riwayat lengkap</Link></div>
    <div className="stats-row"><div className="stat-box"><strong>{attempts.length}</strong><span>Tryout selesai</span></div><div className="stat-box"><strong>{average}{average !== "—" ? "%" : ""}</strong><span>Rata-rata nilai</span></div><div className="stat-box"><strong>{activeAttempt ? "Berlangsung" : "Tidak ada"}</strong><span>Sesi tryout</span></div></div>
    {activeAttempt && <ActiveSession attempt={activeAttempt} initialRemaining={activeAttempt.remainingSeconds} />}
    <div className="dashboard-grid"><section className="panel panel-pad"><div className="section-head" style={{ marginBottom: 18 }}><div><h2 style={{ fontSize: 26 }}>Pilih latihan</h2><p>{activeAttempt ? "Selesaikan atau batalkan sesi yang berlangsung untuk memulai tryout baru." : "Semua jawaban dapat ditinjau sebelum dikumpulkan."}</p></div></div><div className="mode-list">{Object.entries(MODES).map(([key, mode]) => <article className="mode-option" key={key}><div><h3>{mode.label} · {mode.count} soal</h3><p>{mode.quotas.map((count, index) => `${CATEGORIES[index]} ${count}`).join(" · ")}</p><p>Durasi dapat disesuaikan (1–600 menit) atau tanpa batas waktu</p></div><StartTryout mode={key} disabled={Boolean(activeAttempt)} defaultMinutes={mode.durationSec / 60} /></article>)}</div></section>
      <aside><div className="info-panel"><h3>Latihan untuk belajar</h3><p>Setelah tryout, pelajari kembali kunci jawaban, pembahasan, dan sumbernya. Hasil Anda bersifat pribadi dan bukan prediksi hasil asesmen.</p></div><section className="panel panel-pad" style={{ marginTop: 15 }}><h3 style={{ fontSize: 16 }}>Kompetensi yang diujikan</h3>{CATEGORIES.map((category) => <div className="history-row" key={category}><span>{category}</span></div>)}</section></aside>
    </div>
    <section className="panel panel-pad" style={{ marginTop: 23 }}><div className="section-head" style={{ marginBottom: 4 }}><div><h2 style={{ fontSize: 24 }}>Tryout terakhir</h2><p>Evaluasi dapat dibuka kembali kapan saja.</p></div><Link className="text-link" href="/history">Lihat semua</Link></div>{attempts.length ? <div className="history-list">{attempts.map((attempt) => <div className="history-row" key={attempt.id}><div><strong>{MODES[attempt.mode]?.label || "Tryout"}</strong><p>{attempt.submittedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(attempt.submittedAt) : "—"}</p></div><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="score-pill">{attempt.score}%</span><Link className="text-link" href={`/results/${attempt.id}`}>Evaluasi</Link></div></div>)}</div> : <div className="empty-state"><strong>Belum ada hasil latihan</strong>Mulai dari mode singkat untuk mencoba.</div>}</section>
  </div></main>;
}
