import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fail, positivePage, response } from "@/lib/http";

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const searchParams = new URL(request.url).searchParams;
  const requestedPage = positivePage(searchParams.get("page"));
  const pageSize = 20;
  const where = { status: "SUBMITTED" };
  const query = (page) => prisma.attempt.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, school: true } }, _count: { select: { items: true } } },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize
  });
  const [total, requestedAttempts] = await Promise.all([prisma.attempt.count({ where }), query(requestedPage)]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const attempts = page === requestedPage ? requestedAttempts : await query(page);
  return response({ attempts, page, pageSize, total, totalPages });
}
