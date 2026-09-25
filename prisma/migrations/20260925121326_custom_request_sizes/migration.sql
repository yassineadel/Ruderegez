-- CreateEnum
CREATE TYPE "CustomRequestSource" AS ENUM ('NEW_DESIGN', 'RUDEREGEZ_DESIGN');

-- AlterTable
ALTER TABLE "CustomRequest" ADD COLUMN     "baseImageUrl" TEXT,
ADD COLUMN     "baseProductId" TEXT,
ADD COLUMN     "baseProductName" TEXT,
ADD COLUMN     "source" "CustomRequestSource" NOT NULL DEFAULT 'NEW_DESIGN',
ADD COLUMN     "typeId" TEXT;

-- AlterTable
ALTER TABLE "ProductType" ADD COLUMN     "customFactorBp" INTEGER;

-- CreateTable
CREATE TABLE "CategorySize" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weightMg" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategorySize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategorySize_typeId_idx" ON "CategorySize"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySize_typeId_label_key" ON "CategorySize"("typeId", "label");

-- CreateIndex
CREATE INDEX "CustomRequest_typeId_idx" ON "CustomRequest"("typeId");

-- AddForeignKey
ALTER TABLE "CategorySize" ADD CONSTRAINT "CategorySize_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRequest" ADD CONSTRAINT "CustomRequest_baseProductId_fkey" FOREIGN KEY ("baseProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
