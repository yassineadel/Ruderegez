-- CreateEnum
CREATE TYPE "HomeSlideKind" AS ENUM ('PRODUCT', 'REVIEW', 'IMAGE');

-- AlterEnum
ALTER TYPE "AdminPermission" ADD VALUE 'HOMEPAGE';

-- CreateTable
CREATE TABLE "HomeSlide" (
    "id" TEXT NOT NULL,
    "kind" "HomeSlideKind" NOT NULL,
    "productId" TEXT,
    "reviewId" TEXT,
    "imageUrl" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeSlide_isActive_sortOrder_idx" ON "HomeSlide"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "HomeSlide" ADD CONSTRAINT "HomeSlide_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeSlide" ADD CONSTRAINT "HomeSlide_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
