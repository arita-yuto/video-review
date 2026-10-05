-- CreateTable
CREATE TABLE "VideoFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL,
    "createdById" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "VideoFilter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VideoFilter" ADD CONSTRAINT "VideoFilter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

