-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('Internal', 'ExternalOut', 'ExternalIn');

-- AlterTable
ALTER TABLE "stock_transfers" ADD COLUMN     "external_pharmacy" TEXT,
ADD COLUMN     "external_phone" TEXT,
ADD COLUMN     "transfer_type" "TransferType" NOT NULL DEFAULT 'Internal';

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_type_idx" ON "stock_transfers"("transfer_type");
