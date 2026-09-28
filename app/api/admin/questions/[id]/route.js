import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, DIFFICULTIES, normalizeDifficulty } from "@/lib/constants";
import { assertSameOrigin, cleanText, fail, readJson, response, safeUrl } from "@/lib/http";

export async function PATCH(request, { params }) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await readJson(request);
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return fail("Soal tidak ditemukan.", 404);
  const options = body?.options === undefined ? existing.options : body.options.map((item) => cleanText(item, 1000));
  const correctIndex = body?.correctIndex === undefined ? existing.correctIndex : Number(body.correctIndex);
  const category = body?.category === undefined ? existing.category : body.category;
  const sourceUrl = body?.sourceUrl === undefined ? existing.sourceUrl : safeUrl(body.sourceUrl);
  if (!CATEGORIES.includes(category) || !Array.isArray(options) || options.length !== 4 || options.some((item) => !item) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length || !sourceUrl) return fail("Soal harus memiliki empat opsi, satu kunci yang valid, dan URL sumber.");
  const data = {
    category, options, correctIndex, sourceUrl,
    ...(DIFFICULTIES.includes(String(body?.difficulty || "").toLowerCase()) ? { difficulty: normalizeDifficulty(body.difficulty) } : {}),
    ...(typeof body?.hideSource === "boolean" ? { hideSource: body.hideSource } : {}),
    ...(body?.prompt !== undefined ? { prompt: cleanText(body.prompt, 5000) } : {}),
    ...(body?.sourceTitle !== undefined ? { sourceTitle: cleanText(body.sourceTitle, 500) || null } : {}),
    ...(body?.explanation !== undefined ? { explanation: cleanText(body.explanation, 3000) || null } : {}),
    ...(typeof body?.isActive === "boolean" ? { isActive: body.isActive } : {})
  };
  if (data.prompt !== undefined && data.prompt.length < 10) return fail("Teks soal terlalu pendek.");
  return response({ question: await prisma.question.update({ where: { id }, data }) });
}

export async function DELETE(request, { params }) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  try { await prisma.question.delete({ where: { id } }); }
  catch (error) {
    if (error.code === "P2025") return fail("Soal tidak ditemukan.", 404);
    throw error;
  }
  return response({ ok: true, deleted: 1 });
}
