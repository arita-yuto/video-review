-- CreateTable
CREATE TABLE "VideoCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCommentReaction_commentId_userId_kind_key" ON "VideoCommentReaction"("commentId", "userId", "kind");

-- AddForeignKey
ALTER TABLE "VideoCommentReaction" ADD CONSTRAINT "VideoCommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "VideoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

