-- CreateEnum
CREATE TYPE "ReviewSessionStatus" AS ENUM ('STARTED', 'RATED', 'TAGS_SELECTED', 'REVIEW_GENERATED', 'GOOGLE_CLICKED');

-- AlterTable
ALTER TABLE "ReviewSession" ADD COLUMN     "status" "ReviewSessionStatus" NOT NULL DEFAULT 'STARTED';

-- CreateTable
CREATE TABLE "QRScan" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QRScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QRScan_qrCodeId_createdAt_idx" ON "QRScan"("qrCodeId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewSession_qrCodeId_status_idx" ON "ReviewSession"("qrCodeId", "status");

-- AddForeignKey
ALTER TABLE "QRScan" ADD CONSTRAINT "QRScan_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
