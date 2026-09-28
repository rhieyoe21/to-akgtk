import { prisma } from "@/lib/db";
import { CATEGORIES, MODES } from "@/lib/constants";

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function createAttempt(userId, modeKey, timed, durationMinutes) {
  const mode = MODES[modeKey];
  if (!mode) throw new Error("Mode tryout tidak dikenal.");
  let durationSec = mode.durationSec;
  if (timed) {
    const requested = durationMinutes === undefined || durationMinutes === null || durationMinutes === "" ? mode.durationSec / 60 : Number(durationMinutes);
    if (!Number.isFinite(requested) || requested < 1 || requested > 600) throw new Error("Durasi waktu harus antara 1 dan 600 menit.");
    durationSec = Math.round(requested * 60);
  }
  const active = await prisma.question.findMany({
    where: { isActive: true, category: { in: CATEGORIES } },
    select: { id: true, category: true, prompt: true, options: true, correctIndex: true, explanation: true, sourceUrl: true, sourceTitle: true, hideSource: true }
  });
  const selected = [];
  const shortages = [];
  for (let index = 0; index < CATEGORIES.length; index += 1) {
    const category = CATEGORIES[index];
    const required = mode.quotas[index];
    const pool = shuffle(active.filter((question) => question.category === category));
    if (pool.length < required) shortages.push(`${category} (${pool.length}/${required})`);
    selected.push(...pool.slice(0, required));
  }
  if (shortages.length) throw new Error(`Bank soal aktif belum mencukupi: ${shortages.join(", ")}.`);

  const randomized = shuffle(selected).map((question, index) => {
    const order = shuffle(question.options.map((_, optionIndex) => optionIndex));
    return {
      questionId: question.id, position: index + 1, promptSnapshot: question.prompt,
      optionsSnapshot: order.map((optionIndex) => question.options[optionIndex]),
      correctIndex: order.indexOf(question.correctIndex), explanation: question.explanation,
      sourceUrl: question.sourceUrl, sourceTitle: question.sourceTitle, hideSource: question.hideSource, category: question.category
    };
  });
  return prisma.attempt.create({
    data: { userId, mode: modeKey, timed, durationSec, items: { create: randomized } },
    select: { id: true, mode: true, timed: true, durationSec: true, startedAt: true }
  });
}

export async function expireStaleAttempts(userId) {
  const candidates = await prisma.attempt.findMany({
    where: { userId, status: "IN_PROGRESS", timed: true },
    select: { id: true, startedAt: true, durationSec: true }
  });
  const now = Date.now();
  const expired = candidates.filter((attempt) => now >= attempt.startedAt.getTime() + attempt.durationSec * 1000);
  await Promise.all(expired.map((attempt) => submitAttempt(attempt.id, userId).catch(() => null)));
  return expired.map((attempt) => attempt.id);
}

export async function getActiveAttempt(userId) {
  await expireStaleAttempts(userId);
  const attempt = await prisma.attempt.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    select: { id: true, mode: true, timed: true, durationSec: true, startedAt: true, _count: { select: { items: true } } },
    orderBy: { startedAt: "desc" }
  });
  if (!attempt) return null;
  const remainingSeconds = attempt.timed
    ? Math.max(0, Math.ceil((attempt.startedAt.getTime() + attempt.durationSec * 1000 - Date.now()) / 1000))
    : null;
  return { ...attempt, remainingSeconds };
}

export async function abandonAttempt(attemptId, userId) {
  const result = await prisma.attempt.updateMany({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    data: { status: "ABANDONED", submittedAt: new Date() }
  });
  return result.count;
}

export async function submitAttempt(attemptId, userId, isAdmin = false) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({ where: { id: attemptId, ...(isAdmin ? {} : { userId }) }, include: { items: true } });
    if (!attempt) throw new Error("Tryout tidak ditemukan.");
    if (attempt.status === "SUBMITTED") return attempt;
    const correct = attempt.items.filter((item) => item.selectedIndex === item.correctIndex).length;
    const score = attempt.items.length ? Math.round((correct / attempt.items.length) * 10000) / 100 : 0;
    return tx.attempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date(), score } });
  });
}
