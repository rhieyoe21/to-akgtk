import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CATEGORIES, DIFFICULTIES, normalizeDifficulty } from "@/lib/constants";
import { assertSameOrigin, cleanText, fail, readJson, response, safeUrl } from "@/lib/http";
import { findDuplicate } from "@/lib/duplicate-check";

export const runtime = "nodejs";

const MAX_IMPORT = 1000;

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  const raw = Array.isArray(body) ? body : body?.questions;
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail("Body harus berupa array soal atau objek {\"questions\": [...]}.");
  }
  if (raw.length > MAX_IMPORT) return fail(`Maksimal ${MAX_IMPORT} soal per impor.`);

  const existing = await prisma.question.findMany({ select: { prompt: true } });
  const seen = existing.map((question) => question.prompt);
  const valid = [];
  const skipped = [];

  raw.forEach((item, index) => {
    const position = index + 1;
    const category = item?.category;
    const prompt = cleanText(item?.prompt, 5000);
    const options = Array.isArray(item?.options) ? item.options.map((option) => cleanText(option, 1000)) : [];
    const correctIndex = Number(item?.correctIndex);
    if (!CATEGORIES.includes(category)) { skipped.push({ index: position, reason: "Kategori tidak valid." }); return; }
    if (prompt.length < 10) { skipped.push({ index: position, reason: "Teks soal minimal 10 karakter." }); return; }
    if (options.length !== 4 || options.some((option) => !option)) { skipped.push({ index: position, reason: "Opsi harus tepat 4 dan tidak kosong." }); return; }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) { skipped.push({ index: position, reason: "correctIndex harus bilangan 0–3." }); return; }
    const rawSourceUrl = cleanText(item?.sourceUrl, 2000);
    const sourceUrl = rawSourceUrl ? safeUrl(rawSourceUrl) : null;
    if (rawSourceUrl && !sourceUrl) { skipped.push({ index: position, reason: "URL sumber tidak valid." }); return; }
    const duplicate = findDuplicate(prompt, seen);
    if (duplicate.duplicate) {
      skipped.push({ index: position, prompt: prompt.slice(0, 120), reason: `Duplikat atau sangat mirip (kemiripan ${Math.round(duplicate.similarity * 100)}%).` });
      return;
    }
    seen.push(prompt);
    valid.push({
      category,
      prompt,
      options,
      correctIndex,
      sourceUrl,
      sourceTitle: cleanText(item?.sourceTitle, 500) || null,
      explanation: cleanText(item?.explanation, 3000) || null,
      difficulty: DIFFICULTIES.includes(String(item?.difficulty || "").toLowerCase()) ? normalizeDifficulty(item.difficulty) : "sedang",
      hideSource: item?.hideSource === true,
      isActive: item?.isActive !== false,
      generatedByAI: false,
      createdBy: auth.user.id
    });
  });

  if (!valid.length) {
    return response({ created: 0, skippedCount: skipped.length, skipped }, 422);
  }
  const saved = await prisma.question.createMany({ data: valid });
  return response({ created: saved.count, skippedCount: skipped.length, skipped });
}
