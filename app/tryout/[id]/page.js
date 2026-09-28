import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import TryoutRunner from "@/components/TryoutRunner";

export const dynamic = "force-dynamic";

export default async function TryoutPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <TryoutRunner attemptId={id} />;
}
