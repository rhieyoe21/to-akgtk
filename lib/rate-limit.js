import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

export async function rateLimit(key, limit, windowSeconds) {
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  await prisma.$executeRaw`
    INSERT INTO "RateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END,
      "updatedAt" = NOW()
  `;
  const item = await prisma.rateLimit.findUnique({ where: { key }, select: { count: true, resetAt: true } });
  return { allowed: item.count <= limit, retryAfter: Math.max(1, Math.ceil((item.resetAt.getTime() - Date.now()) / 1000)) };
}

// Keamanan rate limit tetap wajib di production. Di development fungsi ini
// melewati rate limit agar alur reset password mudah diuji.
export async function rateLimitInProduction(key, limit, windowSeconds) {
  if (process.env.NODE_ENV !== "production") return { allowed: true, retryAfter: 0, skipped: true };
  return rateLimit(key, limit, windowSeconds);
}

export function requestKey(request, prefix) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const fingerprint = createHash("sha256").update(`${process.env.AUTH_SECRET || "local"}:${ip}`).digest("hex").slice(0, 32);
  return `${prefix}:${fingerprint}`.slice(0, 190);
}
