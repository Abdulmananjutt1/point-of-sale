-- Add barcode field to medicines table for scanner support
ALTER TABLE "medicines" ADD COLUMN "barcode" TEXT;

-- Unique index so each barcode maps to exactly one medicine
CREATE UNIQUE INDEX "medicines_barcode_key" ON "medicines"("barcode") WHERE "barcode" IS NOT NULL;
