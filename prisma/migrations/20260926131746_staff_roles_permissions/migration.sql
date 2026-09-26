-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('ORDERS', 'PAYMENTS', 'PRODUCTS', 'CATEGORIES', 'CUSTOM_REQUESTS', 'REVIEWS', 'POLICIES', 'SETTINGS', 'SILVER_RATE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[];

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permissions" "AdminPermission"[],
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_email_key" ON "StaffInvite"("email");
