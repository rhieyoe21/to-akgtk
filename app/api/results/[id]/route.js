import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, response } from "@/lib/http";

export async function GET(request, { params }) {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  const [attempt, settings] = await Promise.all([
    prisma.attempt.findFirst({
      where: { id, ...(auth.user.role === "ADMIN" ? {} : { userId: auth.user.id }), status: "SUBMITTED" },
      include: { user: { select: { id: true, name: true, email: true, school: true } }, items: { orderBy: { position: "asc" } } }
    }),
    prisma.aiGenerationSettings.findUnique({ where: { id: "default" }, select: { hideSources: true } })
  ]);
  if (!attempt) return fail("Hasil tidak ditemukan.", 404);
  const hideAllSources = settings?.hideSources === true;
  const correct = attempt.items.filter((item) => item.correctIndex === item.selectedIndex).length;
  const categories = Object.groupBy ? Object.groupBy(attempt.items, (item) => item.category) : attempt.items.reduce((groups, item) => {
    (groups[item.category] ||= []).push(item); return groups;
  }, {});
  return response({
    attempt: {
      id: attempt.id, mode: attempt.mode, timed: attempt.timed, score: attempt.score, startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt, user: auth.user.role === "ADMIN" ? attempt.user : null,
      hideSources: hideAllSources,
      correct, total: attempt.items.length,
      breakdown: Object.entries(categories).map(([category, items]) => ({ category, correct: items.filter((item) => item.selectedIndex === item.correctIndex).length, total: items.length })),
      items: attempt.items.map((item) => ({
        id: item.id, position: item.position, prompt: item.promptSnapshot, options: item.optionsSnapshot,
        correctIndex: item.correctIndex, selectedIndex: item.selectedIndex, explanation: item.explanation,
        sourceUrl: item.sourceUrl, sourceTitle: item.sourceTitle, hideSource: item.hideSource, category: item.category
      }))
    }
  });
}
