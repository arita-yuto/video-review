-- AlterTable
ALTER TABLE "VideoRevision" ADD COLUMN     "filmstrip" JSONB;

-- Every succeeded job gets a pending filmstrip step for the local worker to fill in; deleted rows are skipped because the step picker never takes them.
INSERT INTO "VideoProcessingStep" ("id", "jobId", "kind", "status", "updatedAt")
SELECT gen_random_uuid()::text, j."id", 'filmstrip', 'pending', CURRENT_TIMESTAMP
FROM "VideoProcessingJob" j
JOIN "VideoRevision" r ON r."id" = j."videoRevisionId"
JOIN "Video" v ON v."id" = r."videoId"
WHERE j."status" = 'succeeded'
  AND r."deleted" = false AND v."deleted" = false
  AND NOT EXISTS (SELECT 1 FROM "VideoProcessingStep" s WHERE s."jobId" = j."id" AND s."kind" = 'filmstrip');
