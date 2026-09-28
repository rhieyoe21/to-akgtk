import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, fail, positivePage, readJson, response } from "@/lib/http";

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, 100);
  const requestedPage = positivePage(searchParams.get("page"));
  const pageSize = 20;
  const where = { role: "PARTICIPANT", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { school: { contains: q, mode: "insensitive" } }] } : {}) };
  const query = (page) => prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, school: true, isActive: true, createdAt: true, _count: { select: { attempts: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize
  });
  const [total, requestedUsers] = await Promise.all([prisma.user.count({ where }), query(requestedPage)]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const users = page === requestedPage ? requestedUsers : await query(page);
  return response({ users, page, pageSize, total, totalPages });
}

export async function PATCH(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  if (!body?.userId || ![true, false].includes(body?.isActive)) return fail("Data pengguna tidak valid.");
  const user = await prisma.user.updateMany({ where: { id: body.userId, role: "PARTICIPANT" }, data: { isActive: body.isActive, sessionVersion: { increment: 1 } } });
  if (!user.count) return fail("Peserta tidak ditemukan.", 404);
  return response({ ok: true });
}

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  if (!body?.userId) return fail("Peserta tidak ditemukan.");
  const temporaryPassword = randomBytes(18).toString("base64url");
  const updated = await prisma.user.findFirst({ where: { id: body.userId, role: "PARTICIPANT" }, select: { id: true } });
  if (!updated) return fail("Peserta tidak ditemukan.", 404);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: body.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    prisma.resetToken.updateMany({ where: { userId: body.userId, usedAt: null }, data: { usedAt: new Date() } })
  ]);
  return response({ temporaryPassword });
}
