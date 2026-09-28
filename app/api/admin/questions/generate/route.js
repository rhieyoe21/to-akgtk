import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateAuditedQuestions } from "@/lib/question-pipeline";
import { CATEGORIES, DIFFICULTIES, normalizeDifficulty } from "@/lib/constants";
import { assertSameOrigin, cleanText, fail, readJson, response } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  let phase = "settings";
  try {
    const settings = await prisma.aiGenerationSettings.upsert({
      where: { id: "default" },
      create: { id: "default", maxQuestionsPerRequest: 20, requestsPerHour: 8, sourceAuditEnabled: true, sourceEvidenceCheck: false },
      update: {}
    });
    const limit = await rateLimit(`ai:${auth.user.id}:${requestKey(request, "")}`, settings.requestsPerHour, 3600);
    if (!limit.allowed) return fail("Batas generasi AI sementara tercapai. Coba lagi nanti.", 429);
    const body = await readJson(request);
    const category = body?.category;
    const quantity = Number(body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > settings.maxQuestionsPerRequest) {
      return fail(`Jumlah soal harus antara 1 dan ${settings.maxQuestionsPerRequest} sesuai pengaturan admin.`);
    }
    const difficulty = DIFFICULTIES.includes(String(body?.difficulty || "").toLowerCase()) ? normalizeDifficulty(body.difficulty) : "sedang";
    phase = "database";
    const existing = category && CATEGORIES.includes(category)
      ? await prisma.question.findMany({ where: { category, isActive: true }, select: { prompt: true }, orderBy: { createdAt: "desc" }, take: 200 })
      : [];
    phase = "gemini";
    const { questions, skipped, diagnostics } = await generateAuditedQuestions({
      category,
      quantity,
      maxQuantity: settings.maxQuestionsPerRequest,
      focus: cleanText(body?.focus, 500),
      useGoogleSearch: body?.useGoogleSearch === true,
      difficulty,
      existingPrompts: existing.map((item) => item.prompt),
      sourceAudit: settings.sourceAuditEnabled,
      sourceEvidenceCheck: settings.sourceEvidenceCheck
    });
    if (questions.length === 0) {
      console.error("Gemini soal generation log", JSON.stringify({ message: "Semua soal ditolak validasi.", skipped, diagnostics }));
      return response({
        error: "Semua soal ditolak karena sumber tidak valid atau tidak dapat diverifikasi. Coba generate ulang.",
        details: { ...diagnostics, skipped }
      }, 422);
    }
    phase = "database";
    const saved = await prisma.question.createMany({ data: questions.map((question) => ({ ...question, createdBy: auth.user.id })) });
    return response({ created: saved.count, category, skippedCount: skipped.length, skipped, groundingUnavailable: Boolean(diagnostics?.groundingUnavailable) });
  } catch (error) {
    if (phase === "gemini") {
      const details = error.details || null;
      console.error("Gemini soal generation log", JSON.stringify({ message: error.message, details }));
      return response({ error: error.message || "Gemini gagal membuat soal. Coba lagi.", details }, 502);
    }
    console.error(`AI question generation failed during ${phase}.`, error);
    return fail("Layanan generate soal sementara tidak tersedia. Coba beberapa saat lagi.", 503);
  }
}
