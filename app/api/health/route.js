import { prisma } from "@/lib/db";
import { response } from "@/lib/http";

export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return response({ status: "ok" }); }
  catch { return response({ status: "unavailable" }, 503); }
}
