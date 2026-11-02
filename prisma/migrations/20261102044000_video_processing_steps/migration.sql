-- CreateEnum
CREATE TYPE "ProcessingStepKind" AS ENUM ('thumbnail', 'downscaled', 'filmstrip');

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'skipped';

-- CreateTable
CREATE TABLE "VideoProcessingStep" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "ProcessingStepKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProcessingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoProcessingStep_status_idx" ON "VideoProcessingStep"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProcessingStep_jobId_kind_key" ON "VideoProcessingStep"("jobId", "kind");

-- AddForeignKey
ALTER TABLE "VideoProcessingStep" ADD CONSTRAINT "VideoProcessingStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "VideoProcessingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A job that succeeded before steps existed produced a thumbnail and the downscaled copies; failed and running jobs stay as they are.
INSERT INTO "VideoProcessingStep" ("id", "jobId", "kind", "status", "updatedAt")
SELECT gen_random_uuid()::text, j."id", k."kind", 'succeeded', CURRENT_TIMESTAMP
FROM "VideoProcessingJob" j
CROSS JOIN (VALUES ('thumbnail'::"ProcessingStepKind"), ('downscaled'::"ProcessingStepKind")) AS k("kind")
WHERE j."status" = 'succeeded';
