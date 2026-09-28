import { requireUser } from "@/lib/auth";
import { submitAttempt } from "@/lib/attempts";
import { assertSameOrigin, fail, response } from "@/lib/http";

export async function POST(request, { params }) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireUser();
  if (auth.error) return fail(auth.error, auth.status);
  const { id } = await params;
  try {
    const attempt = await submitAttempt(id, auth.user.id);
    return response({ ok: true, resultUrl: `/results/${id}`, score: attempt.score });
  } catch (error) { return fail(error.message, 404); }
}
