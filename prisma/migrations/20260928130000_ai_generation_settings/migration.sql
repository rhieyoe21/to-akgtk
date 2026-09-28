CREATE TABLE "AiGenerationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxQuestionsPerRequest" INTEGER NOT NULL DEFAULT 20,
    "requestsPerHour" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiGenerationSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AiGenerationSettings_maxQuestionsPerRequest_check" CHECK ("maxQuestionsPerRequest" >= 1 AND "maxQuestionsPerRequest" <= 50),
    CONSTRAINT "AiGenerationSettings_requestsPerHour_check" CHECK ("requestsPerHour" >= 1 AND "requestsPerHour" <= 100)
);
