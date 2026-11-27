-- CreateIndex
CREATE INDEX "VideoComment_createdAt_idx" ON "VideoComment"("createdAt");

-- CreateIndex
CREATE INDEX "VideoCommentReaction_createdAt_idx" ON "VideoCommentReaction"("createdAt");

-- CreateIndex
CREATE INDEX "VideoRevision_uploadedAt_idx" ON "VideoRevision"("uploadedAt");
