-- Requeues the succeeded downscaled steps, so the local worker makes the files again with the index at the front; deleted rows are skipped because the step picker never takes them.
UPDATE "VideoProcessingStep" s
SET "status" = 'pending', "updatedAt" = CURRENT_TIMESTAMP
FROM "VideoProcessingJob" j
JOIN "VideoRevision" r ON r."id" = j."videoRevisionId"
JOIN "Video" v ON v."id" = r."videoId"
WHERE s."jobId" = j."id"
  AND s."kind" = 'downscaled' AND s."status" = 'succeeded'
  AND r."deleted" = false AND v."deleted" = false;
