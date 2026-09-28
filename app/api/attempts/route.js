import { requireUser } from "@/lib/auth";
import { createAttempt, getActiveAttempt } from "@/lib/attempts";
import { assertSameOrigin, fail, readJson, response } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const active = await getActiveAttempt(auth.user.id);
  if (active) {
    return response({
      error: "Anda masih memiliki sesi tryout yang berlangsung. Lanjutkan atau batalkan sesi tersebut terlebih dahulu.",
      active: true,
      attemptId: active.id
    }, 409);
  }
  const quota = await rateLimit(`attempt:${auth.user.id}`, 10, 3600);
  if (!quota.allowed) return fail("Batas tryout per jam tercapai. Coba lagi nanti.", 429);
  const body = await readJson(request);
  try {
    const attempt = await createAttempt(auth.user.id, body?.mode, body?.timed !== false, body?.durationMinutes);
    return response({ attempt }, 201);
  } catch (error) {
    return fail(error.message || "Tryout tidak dapat dimulai.", 422);
  }
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const activeAttempt = await getActiveAttempt(auth.user.id);
  return response({ activeAttempt, attempts: activeAttempt ? [activeAttempt] : [] });
}
