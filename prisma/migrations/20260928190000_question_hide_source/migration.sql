ALTER TABLE "Question"
    ADD COLUMN "hideSource" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AttemptQuestion"
    ADD COLUMN "hideSource" BOOLEAN NOT NULL DEFAULT false;
