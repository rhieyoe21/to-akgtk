import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { fail, response } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const [participants, submitted, bank] = await Promise.all([
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.attempt.count({ where: { status: "SUBMITTED" } }),
    prisma.question.groupBy({ by: ["category"], where: { isActive: true }, _count: { _all: true } })
  ]);
  const questionCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0]));
  for (const row of bank) questionCounts[row.category] = row._count._all;
  return response({ participants, submitted, questionCounts });
}
