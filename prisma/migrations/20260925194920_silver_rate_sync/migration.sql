-- CreateEnum
CREATE TYPE "SilverRateStatus" AS ENUM ('APPLIED', 'HELD', 'DISMISSED');

-- CreateTable
CREATE TABLE "SilverRateSnapshot" (
    "id" TEXT NOT NULL,
    "status" "SilverRateStatus" NOT NULL,
    "rateMinor" INTEGER NOT NULL,
    "previousRateMinor" INTEGER NOT NULL,
    "usdPerOzCents" INTEGER NOT NULL,
    "egpPerUsdMilli" INTEGER NOT NULL,
    "trigger" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SilverRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SilverRateSnapshot_status_createdAt_idx" ON "SilverRateSnapshot"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SilverRateSnapshot_createdAt_idx" ON "SilverRateSnapshot"("createdAt");
