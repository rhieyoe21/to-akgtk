import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, fail, readJson, response } from "@/lib/http";

export async function DELETE(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10000 || ids.some((id) => typeof id !== "string" || !id.trim() || id.length > 64)) {
    return fail("Pilih 1–10000 soal untuk dihapus.");
  }
  const result = await prisma.question.deleteMany({ where: { id: { in: [...new Set(ids)] } } });
  return response({ ok: true, deleted: result.count });
}
