import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, response } from "@/lib/http";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const attempts = await prisma.attempt.findMany({
    where: { userId: auth.user.id, status: "SUBMITTED" },
    select: { id: true, mode: true, score: true, timed: true, startedAt: true, submittedAt: true, _count: { select: { items: true } } },
    orderBy: { submittedAt: "desc" }, take: 100
  });
  return response({ attempts });
}
