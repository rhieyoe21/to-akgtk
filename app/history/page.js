import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { MODES } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  const attempts = await prisma.attempt.findMany({ where: { userId: user.id, status: "SUBMITTED" }, select: { id: true, mode: true, score: true, timed: true, startedAt: true, submittedAt: true, _count: { select: { items: true } } }, orderBy: { submittedAt: "desc" } });
  return <main className="page-main"><div className="shell"><div className="page-heading"><div><div className="eyebrow">Catatan belajar</div><h1>Riwayat tryout</h1><p>Semua hasil Anda tersimpan di sini.</p></div><Link className="button secondary" href="/dashboard">Kembali ke dashboard</Link></div><section className="panel panel-pad">{attempts.length ? <div className="history-list">{attempts.map((attempt) => <div className="history-row" key={attempt.id}><div><strong>{MODES[attempt.mode]?.label || "Tryout"} · {attempt._count.items} soal</strong><p>{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(attempt.submittedAt)}</p><p>{attempt.timed ? "Dengan waktu" : "Tanpa waktu"}</p></div><div style={{ display: "flex", alignItems: "center", gap: 14 }}><span className="score-pill">{attempt.score}%</span><Link className="text-link" href={`/results/${attempt.id}`}>Buka evaluasi</Link></div></div>)}</div> : <div className="empty-state"><strong>Belum ada riwayat tryout</strong>Selesaikan latihan pertama Anda untuk menyimpan hasil.</div>}</section></div></main>;
}
