-- AlterTable
ALTER TABLE "ReviewSession" ADD COLUMN     "generatedReviews" TEXT[] DEFAULT ARRAY[]::TEXT[];
