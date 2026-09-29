import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin, cleanText, fail, readJson, response, safeUrl } from "@/lib/http";

const SETTINGS_ID = "default";
const DEFAULTS = { maxQuestionsPerRequest: 20, requestsPerHour: 8, sourceAuditEnabled: true, sourceEvidenceCheck: false, hideSources: false };

async function getOrCreateSettings() {
  return prisma.aiGenerationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...DEFAULTS },
    update: {}
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  return response({ settings: await getOrCreateSettings() });
}

export async function PATCH(request) {
  if (!assertSameOrigin(request)) return fail("Permintaan tidak diizinkan.", 403);
  const auth = await requireAdmin();
  if (auth.error) return fail(auth.error, auth.status);
  const body = await readJson(request);
  const maxQuestionsPerRequest = Number(body?.maxQuestionsPerRequest);
  const requestsPerHour = Number(body?.requestsPerHour);
  const sourceAuditEnabled = body?.sourceAuditEnabled !== false;
  const sourceEvidenceCheck = body?.sourceEvidenceCheck === true;
  const hideSources = body?.hideSources === true;
  const donationMessage = cleanText(body?.donationMessage, 500);
  const rawDonationUrl = cleanText(body?.donationUrl, 500);
  const donationUrl = rawDonationUrl ? safeUrl(rawDonationUrl) : "";
  if (!Number.isInteger(maxQuestionsPerRequest) || maxQuestionsPerRequest < 1 || maxQuestionsPerRequest > 50) {
    return fail("Batas soal per batch harus antara 1 dan 50.");
  }
  if (!Number.isInteger(requestsPerHour) || requestsPerHour < 1 || requestsPerHour > 100) {
    return fail("Batas permintaan per jam harus antara 1 dan 100.");
  }
  if (rawDonationUrl && !donationUrl) {
    return fail("URL donasi harus berupa tautan HTTP atau HTTPS yang valid.");
  }
  const settings = await prisma.aiGenerationSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, maxQuestionsPerRequest, requestsPerHour, sourceAuditEnabled, sourceEvidenceCheck, hideSources, donationUrl: donationUrl || null, donationMessage: donationMessage || null },
    update: { maxQuestionsPerRequest, requestsPerHour, sourceAuditEnabled, sourceEvidenceCheck, hideSources, donationUrl: donationUrl || null, donationMessage: donationMessage || null }
  });
  return response({ settings });
}
