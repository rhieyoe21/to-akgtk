import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendResetEmail } from "@/lib/mailer";
import { assertSameOrigin, cleanText, fail, readRequestBody, response } from "@/lib/http";
import { rateLimitInProduction, requestKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const limit = await rateLimitInProduction(requestKey(request, "forgot"), 5, 3600);
  if (!limit.allowed) return fail("Terlalu banyak permintaan. Coba lagi nanti.", 429);
  const body = await readRequestBody(request);
  const email = cleanText(body?.email, 254).toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isActive: true } });
    if (user?.isActive) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await prisma.resetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.resetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
      const link = `${appUrl}/reset-password?token=${rawToken}`;
      try {
        await sendResetEmail(user.email, link);
        if (!isProduction) console.info(`[reset-password] Email reset terkirim ke ${user.email}. Tautan development: ${link}`);
      } catch (error) {
        if (isProduction) {
          console.error(`[reset-password] Gagal mengirim email reset untuk ${user.email}: ${error.message}`);
          await prisma.resetToken.updateMany({ where: { tokenHash }, data: { usedAt: new Date() } });
        } else {
          console.warn(`[reset-password] SMTP gagal atau belum dikonfigurasi (${error.message}). Tautan reset development untuk ${user.email}:\n${link}`);
        }
      }
    }
  }
  return response({ message: "Jika email terdaftar dan email aktif, tautan reset password akan dikirim." });
}
