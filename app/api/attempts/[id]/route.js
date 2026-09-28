import { requireUser } from "@/lib/auth";
import { abandonAttempt, submitAttempt } from "@/lib/attempts";
import { prisma } from "@/lib/db";
import { assertSameOrigin, fail, readJson, response } from "@/lib/http";

export async function GET(request, { params }) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const attempt = await prisma.attempt.findFirst({ where: { id, userId: auth.user.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!attempt) return fail("Tryout tidak ditemukan.", 404);
  if (attempt.status === "IN_PROGRESS" && attempt.timed && Date.now() >= attempt.startedAt.getTime() + attempt.durationSec * 1000) {
    await submitAttempt(id, auth.user.id);
    return response({ expired: true });
  }
  if (attempt.status !== "IN_PROGRESS") return response({ completed: true, resultUrl: `/results/${id}` });
  const remainingSeconds = attempt.timed
    ? Math.max(0, Math.ceil((attempt.startedAt.getTime() + attempt.durationSec * 1000 - Date.now()) / 1000))
    : null;
  return response({ attempt: {
    id: attempt.id, mode: attempt.mode, timed: attempt.timed, durationSec: attempt.durationSec, startedAt: attempt.startedAt, remainingSeconds,
    items: attempt.items.map((item) => ({ id: item.id, position: item.position, prompt: item.promptSnapshot, options: item.optionsSnapshot, category: item.category, selectedIndex: item.selectedIndex }))
  } });
}

export async function DELETE(request, { params }) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const count = await abandonAttempt(id, auth.user.id);
  if (!count) return fail("Sesi tryout tidak ditemukan atau sudah selesai.", 404);
  return response({ ok: true });
}

export async function PATCH(request, { params }) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await readJson(request);
  if (!body?.itemId || !Number.isInteger(body?.selectedIndex) || body.selectedIndex < 0 || body.selectedIndex > 3) return fail("Jawaban tidak valid.");
  const attempt = await prisma.attempt.findFirst({ where: { id, userId: auth.user.id }, select: { id: true, status: true, timed: true, durationSec: true, startedAt: true } });
  if (!attempt) return fail("Tryout tidak ditemukan.", 404);
  if (attempt.status !== "IN_PROGRESS") return fail("Tryout sudah dikumpulkan.", 409);
  if (attempt.timed && Date.now() >= attempt.startedAt.getTime() + attempt.durationSec * 1000) {
    await submitAttempt(id, auth.user.id);
    return fail("Waktu tryout sudah habis. Jawaban tersimpan dan tryout telah dikumpulkan.", 409);
  }
  const item = await prisma.attemptQuestion.findFirst({ where: { id: body.itemId, attemptId: id }, select: { id: true, optionsSnapshot: true } });
  if (!item || body.selectedIndex >= item.optionsSnapshot.length) return fail("Soal tidak ditemukan.", 404);
  await prisma.attemptQuestion.update({ where: { id: item.id }, data: { selectedIndex: body.selectedIndex } });
  return response({ ok: true });
}
