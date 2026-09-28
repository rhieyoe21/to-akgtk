import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertSameOrigin, cleanText, fail, isJsonRequest, readRequestBody, redirectAfterAuth, response } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const limit = await rateLimit(requestKey(request, "register"), 5, 3600);
  if (!limit.allowed) return fail("Terlalu banyak percobaan. Coba lagi nanti.", 429);
  const body = await readRequestBody(request);
  const name = cleanText(body?.name, 120);
  const school = cleanText(body?.school, 160);
  const email = cleanText(body?.email, 254).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (name.length < 2 || !school || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128 || password !== confirmPassword) {
    return fail("Lengkapi data dengan benar. Password minimal 8 karakter.");
  }
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return fail("Email sudah terdaftar. Silakan masuk atau gunakan reset password.", 409);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, school, email, passwordHash }, select: { id: true, name: true, email: true, school: true, role: true } });
  const redirectTo = "/login?registered=1";
  if (!isJsonRequest(request)) return redirectAfterAuth(request, redirectTo);
  return response({ message: "Pendaftaran berhasil. Silakan masuk dengan akun yang baru dibuat.", redirectTo }, 201);
}
