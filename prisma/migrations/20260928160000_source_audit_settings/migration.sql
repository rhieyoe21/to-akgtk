ALTER TABLE "AiGenerationSettings"
    ADD COLUMN "sourceAuditEnabled" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "sourceEvidenceCheck" BOOLEAN NOT NULL DEFAULT false;
