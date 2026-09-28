ALTER TABLE "Question"
    ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'sedang';

CREATE INDEX "Question_category_difficulty_isActive_idx" ON "Question"("category", "difficulty", "isActive");
