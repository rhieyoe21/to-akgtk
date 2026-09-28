import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, DIFFICULTIES } from "@/lib/constants";
import { cleanText, fail, response } from "@/lib/http";

export const runtime = "nodejs";

const MAX_IDS = 10000;

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = cleanText(searchParams.get("q"), 100);
  const status = searchParams.get("status");
  const difficulty = searchParams.get("difficulty");
  const statusFilter = status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {};
  const difficultyFilter = DIFFICULTIES.includes(difficulty) ? { difficulty } : {};
  const where = { ...statusFilter, ...difficultyFilter, ...(CATEGORIES.includes(category) ? { category } : {}), ...(q ? { prompt: { contains: q, mode: "insensitive" } } : {}) };
  const rows = await prisma.question.findMany({ where, select: { id: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: MAX_IDS });
  return response({ ids: rows.map((row) => row.id), total: rows.length, capped: rows.length === MAX_IDS });
}
