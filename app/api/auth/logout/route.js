import { clearSession } from "@/lib/auth";
import { assertSameOrigin, fail, response } from "@/lib/http";

export async function POST(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  await clearSession();
  return response({ ok: true });
}
