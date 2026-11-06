-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('Internal', 'ExternalOut', 'ExternalIn');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('Pending', 'InTransit', 'Received', 'Returned', 'PaidCash', 'Rejected');

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "transfer_type" "TransferType" NOT NULL DEFAULT 'Internal',
    "from_branch" TEXT NOT NULL,
    "to_branch" TEXT NOT NULL,
    "external_pharmacy" TEXT,
    "external_phone" TEXT,
    "contact_person" TEXT,
    "settlement_type" TEXT DEFAULT 'StockReturn',
    "settled_amount" DECIMAL(10,2),
    "transfer_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receive_date" TIMESTAMP(3),
    "settled_date" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "initiated_by" TEXT NOT NULL DEFAULT 'Admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "transfer_id" TEXT NOT NULL,
    "medicine_id" TEXT,
    "medicine_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "batch_number" TEXT,
    "expiry_date" TIMESTAMP(3),

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_type_idx" ON "stock_transfers"("transfer_type");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_date_idx" ON "stock_transfers"("transfer_date");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- CreateIndex
CREATE INDEX "stock_transfer_items_medicine_id_idx" ON "stock_transfer_items"("medicine_id");

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

