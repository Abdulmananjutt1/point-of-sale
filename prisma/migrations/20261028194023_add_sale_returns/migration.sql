-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('Approved', 'Rejected', 'Partial');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('Defective', 'Expired', 'WrongItem', 'CustomerRequest', 'Other');

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('Good', 'Opened', 'Damaged', 'Expired');

-- DropIndex
DROP INDEX "sales_created_at_idx";

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "return_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "refund_amount" DECIMAL(12,2) NOT NULL,
    "refund_method" TEXT NOT NULL DEFAULT 'Cash',
    "status" "ReturnStatus" NOT NULL DEFAULT 'Approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sale_id" TEXT NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_items" (
    "id" TEXT NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "sale_quantity" INTEGER NOT NULL,
    "return_quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "reason" "ReturnReason" NOT NULL DEFAULT 'CustomerRequest',
    "condition" "ReturnCondition" NOT NULL DEFAULT 'Good',
    "return_id" TEXT NOT NULL,
    "medicine_id" TEXT,

    CONSTRAINT "sale_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_returns_return_number_key" ON "sale_returns"("return_number");

-- CreateIndex
CREATE INDEX "sale_returns_sale_id_idx" ON "sale_returns"("sale_id");

-- CreateIndex
CREATE INDEX "sale_returns_return_date_idx" ON "sale_returns"("return_date");

-- CreateIndex
CREATE INDEX "sale_return_items_return_id_idx" ON "sale_return_items"("return_id");

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
