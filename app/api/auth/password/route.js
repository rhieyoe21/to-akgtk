import bcrypt from "bcryptjs";
import { createSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, fail, readRequestBody, response } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const limit = await rateLimit(requestKey(request, "password"), 10, 900);
  if (!limit.allowed) return fail("Terlalu banyak percobaan. Coba lagi nanti.", 429);
  const body = await readRequestBody(request);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (newPassword.length < 8 || newPassword.length > 128 || newPassword !== confirmPassword) {
    return fail("Password baru minimal 8 karakter dan konfirmasi harus sama.");
  }
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!user || !user.isActive) return fail("Akun tidak ditemukan.", 404);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return fail("Password saat ini tidak sesuai.", 400);
  if (currentPassword === newPassword) return fail("Password baru harus berbeda dari password saat ini.", 400);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
    select: { id: true, name: true, email: true, school: true, role: true, sessionVersion: true }
  });
  // Perbarui cookie sesi saat ini agar tetap aktif, sementara sesi lain dicabut.
  await createSession(updated);
  return response({ ok: true, message: "Password berhasil diubah. Sesi lain telah dikeluarkan." });
}
