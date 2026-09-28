import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import AdminConsole from "@/components/AdminConsole";
import AdminStats from "@/components/AdminStats";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const [participants, submitted, bank] = await Promise.all([
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.attempt.count({ where: { status: "SUBMITTED" } }),
    prisma.question.groupBy({ by: ["category"], where: { isActive: true }, _count: { _all: true } })
  ]);
  const questionCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const row of bank) questionCounts[row.category] = row._count._all;
  return <main className="page-main"><div className="shell"><div className="page-heading"><div><div className="eyebrow">Pengelolaan pusat</div><h1>Ruang kendali</h1><p>Kelola bank soal, peserta, dan hasil simulasi.</p></div></div>
    <AdminStats initial={{ participants, submitted, questionCounts }} />
    <AdminConsole />
  </div></main>;
}
