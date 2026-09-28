import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, DIFFICULTIES, normalizeDifficulty } from "@/lib/constants";
import { assertSameOrigin, cleanText, fail, positivePage, readJson, response, safeUrl } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = cleanText(searchParams.get("q"), 100);
  const requestedPage = positivePage(searchParams.get("page"));
  const status = searchParams.get("status");
  const difficulty = searchParams.get("difficulty");
  const pageSize = 20;
  const statusFilter = status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {};
  const difficultyFilter = DIFFICULTIES.includes(difficulty) ? { difficulty } : {};
  const where = { ...statusFilter, ...difficultyFilter, ...(CATEGORIES.includes(category) ? { category } : {}), ...(q ? { prompt: { contains: q, mode: "insensitive" } } : {}) };
  const query = (page) => prisma.question.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize });
  const [total, requestedQuestions] = await Promise.all([prisma.question.count({ where }), query(requestedPage)]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const questions = page === requestedPage ? requestedQuestions : await query(page);
  return response({ questions, page, pageSize, total, totalPages });
}

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  const category = body?.category;
  const prompt = cleanText(body?.prompt, 5000);
  const options = Array.isArray(body?.options) ? body.options.map((item) => cleanText(item, 1000)) : [];
  const correctIndex = Number(body?.correctIndex);
  const sourceUrl = safeUrl(body?.sourceUrl);
  const difficulty = DIFFICULTIES.includes(String(body?.difficulty || "").toLowerCase()) ? normalizeDifficulty(body.difficulty) : "sedang";
  if (!CATEGORIES.includes(category) || prompt.length < 10 || options.length !== 4 || options.some((item) => !item) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length || !sourceUrl) {
    return fail("Periksa kategori, soal, empat opsi, kunci jawaban, dan URL sumber.");
  }
  const question = await prisma.question.create({ data: {
    category, difficulty, prompt, options, correctIndex, sourceUrl,
    sourceTitle: cleanText(body?.sourceTitle, 500) || null,
    explanation: cleanText(body?.explanation, 3000) || null,
    hideSource: body?.hideSource === true,
    isActive: body?.isActive !== false, createdBy: auth.user.id
  } });
  return response({ question }, 201);
}
