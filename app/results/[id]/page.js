import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeUrl } from "@/lib/http";
import ResultViewer from "@/components/ResultViewer";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const settings = await prisma.aiGenerationSettings.findUnique({ where: { id: "default" }, select: { donationUrl: true, donationMessage: true } });
  const donationUrl = safeUrl(settings?.donationUrl || process.env.DONATION_URL || "");
  const donationMessage = settings?.donationMessage || process.env.DONATION_MESSAGE || "";
  return <ResultViewer attemptId={id} donationUrl={donationUrl} donationMessage={donationMessage} />;
}
