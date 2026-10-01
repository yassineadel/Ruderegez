-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeMinor" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryZone_name_key" ON "DeliveryZone"("name");

-- CreateIndex
CREATE INDEX "DeliveryZone_isActive_sortOrder_idx" ON "DeliveryZone"("isActive", "sortOrder");

-- Data: the store delivered to one city at one flat fee, both kept in
-- settings. That city becomes the first area, at the fee it had, so checkout
-- charges exactly what it did before until the admin adds more areas.
INSERT INTO "DeliveryZone" ("id", "name", "feeMinor", "isActive", "sortOrder", "updatedAt")
SELECT
    'zone_initial',
    COALESCE(
        NULLIF(TRIM((SELECT "value" FROM "Setting" WHERE "key" = 'deliveryCityAllowed')), ''),
        'Cairo'
    ),
    COALESCE(
        (SELECT "value"::INTEGER FROM "Setting"
         WHERE "key" = 'deliveryFeeMinor' AND "value" ~ '^[0-9]+$'),
        8000
    ),
    true,
    0,
    CURRENT_TIMESTAMP;

-- The two settings are replaced by the table above.
DELETE FROM "Setting" WHERE "key" IN ('deliveryFeeMinor', 'deliveryCityAllowed');
