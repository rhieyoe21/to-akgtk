import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertSameOrigin, fail, readRequestBody, response } from "@/lib/http";
import { rateLimitInProduction, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const limit = await rateLimitInProduction(requestKey(request, "reset"), 5, 900);
  if (!limit.allowed) return fail("Terlalu banyak percobaan. Coba lagi nanti.", 429);
  const body = await readRequestBody(request);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (token.length < 30 || password.length < 8 || password.length > 128) return fail("Token atau password tidak valid. Password minimal 8 karakter.");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await prisma.resetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return fail("Tautan reset tidak valid atau sudah kedaluwarsa.", 400);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    prisma.resetToken.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: new Date() } })
  ]);
  return response({ message: "Password berhasil diperbarui. Silakan masuk kembali." });
}
