-- AlterTable
ALTER TABLE "VideoComment" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill authors of existing comments whose email matches a user
UPDATE "VideoComment" c SET "userId" = u."id"
FROM "User" u
WHERE c."userEmail" <> '' AND lower(c."userEmail") = lower(u."email");
