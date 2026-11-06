-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('Pending', 'InTransit', 'Received', 'Rejected');

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "from_branch" TEXT NOT NULL,
    "to_branch" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receive_date" DATE,
    "status" "TransferStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "initiated_by" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "batch_number" TEXT,
    "expiry_date" DATE,
    "transfer_id" TEXT NOT NULL,
    "medicine_id" TEXT,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_transfer_number_key" ON "stock_transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");

-- CreateIndex
CREATE INDEX "stock_transfers_transfer_date_idx" ON "stock_transfers"("transfer_date");

-- CreateIndex
CREATE INDEX "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
