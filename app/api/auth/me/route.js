import { getSessionUser } from "@/lib/auth";
import { response } from "@/lib/http";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return response({ user: null });
  const { id, name, email, school, role } = user;
  return response({ user: { id, name, email, school, role } });
}
