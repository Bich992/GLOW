-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "born_during_wave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fuel_points_total" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "glow_trust" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "tag_vector" JSONB,
ADD COLUMN     "temp_state" TEXT NOT NULL DEFAULT 'COLD',
ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trust_strikes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TemporaryPostLog" (
    "id" TEXT NOT NULL,
    "originalPostId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "textEncrypted" TEXT NOT NULL,
    "mediaUrlHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryPostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryPostLog_originalPostId_key" ON "TemporaryPostLog"("originalPostId");

-- CreateIndex
CREATE INDEX "TemporaryPostLog_deleteAfter_idx" ON "TemporaryPostLog"("deleteAfter");

-- CreateIndex
CREATE INDEX "TemporaryPostLog_authorId_idx" ON "TemporaryPostLog"("authorId");
