import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { assertSameOrigin, cleanText, fail, isJsonRequest, readRequestBody, redirectAfterAuth, response } from "@/lib/http";
import { rateLimit, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const limit = await rateLimit(requestKey(request, "login"), 10, 900);
  if (!limit.allowed) return fail("Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.", 429);
  const body = await readRequestBody(request);
  const email = cleanText(body?.email, 254).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && user.isActive && await bcrypt.compare(password, user.passwordHash);
  if (!valid) return fail("Email atau password tidak sesuai.", 401);
  await createSession(user);
  if (!isJsonRequest(request)) return redirectAfterAuth(request, user.role === "ADMIN" ? "/admin" : "/dashboard");
  return response({ user: { id: user.id, name: user.name, email: user.email, school: user.school, role: user.role } });
}
