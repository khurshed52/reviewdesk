-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTag_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "ReviewTag_categoryId_idx" ON "ReviewTag"("categoryId");
CREATE UNIQUE INDEX "ReviewTag_categoryId_slug_key"
ON "ReviewTag"("categoryId", "slug");

-- Add categoryId as nullable first
ALTER TABLE "Business"
ADD COLUMN "categoryId" TEXT;

-- Create Category rows from existing Business.category values
INSERT INTO "Category" (
    "id",
    "name",
    "slug",
    "createdAt",
    "updatedAt"
)
SELECT
    'cat_' || md5("category"),
    "category",
    lower(trim(both '-' from regexp_replace("category", '[^a-zA-Z0-9]+', '-', 'g'))),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business"
GROUP BY "category";

-- Link existing businesses to categories
UPDATE "Business" b
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."name" = b."category";

-- categoryId is now safe to require
ALTER TABLE "Business"
ALTER COLUMN "categoryId" SET NOT NULL;

CREATE INDEX "Business_categoryId_idx"
ON "Business"("categoryId");

-- Foreign keys
ALTER TABLE "Business"
ADD CONSTRAINT "Business_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "ReviewTag"
ADD CONSTRAINT "ReviewTag_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Remove old string category only after backfill
ALTER TABLE "Business"
DROP COLUMN "category";