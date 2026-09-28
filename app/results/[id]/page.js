import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { safeUrl } from "@/lib/http";
import ResultViewer from "@/components/ResultViewer";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const donationUrl = safeUrl(process.env.DONATION_URL || "");
  return <ResultViewer attemptId={id} donationUrl={donationUrl} donationMessage={process.env.DONATION_MESSAGE || ""} />;
}
