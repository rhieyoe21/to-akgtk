import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, fail, readJson, response } from "@/lib/http";

export async function PATCH(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10000 || ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 64)) {
    return fail("Pilih 1–10000 soal.");
  }
  if (typeof body?.hideSource !== "boolean") return fail("Data sembunyikan sumber tidak valid.");
  const result = await prisma.question.updateMany({ where: { id: { in: [...new Set(ids)] } }, data: { hideSource: body.hideSource } });
  return response({ ok: true, updated: result.count, hideSource: body.hideSource });
}
