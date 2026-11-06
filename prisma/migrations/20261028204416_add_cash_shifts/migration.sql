-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('Open', 'Closed');

-- CreateTable
CREATE TABLE "cash_shifts" (
    "id" TEXT NOT NULL,
    "shift_number" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "closed_by" TEXT,
    "open_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "close_time" TIMESTAMP(3),
    "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(12,2),
    "expected_cash" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "status" "ShiftStatus" NOT NULL DEFAULT 'Open',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_shift_entries" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'in',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift_id" TEXT NOT NULL,

    CONSTRAINT "cash_shift_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_shifts_shift_number_key" ON "cash_shifts"("shift_number");

-- CreateIndex
CREATE INDEX "cash_shifts_status_idx" ON "cash_shifts"("status");

-- CreateIndex
CREATE INDEX "cash_shift_entries_shift_id_idx" ON "cash_shift_entries"("shift_id");

-- AddForeignKey
ALTER TABLE "cash_shift_entries" ADD CONSTRAINT "cash_shift_entries_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
