-- ============================================================
-- Add missing tables & columns that were skipped in prior migrations
-- Uses IF NOT EXISTS / DO $$ blocks to be idempotent
-- ============================================================

-- ── Enums (only create if missing) ───────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "StockCountStatus" AS ENUM ('Draft', 'InProgress', 'Completed', 'Verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('LowStock', 'ExpiryAlert', 'ReturnProcessed', 'PurchaseOrder', 'System');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ShiftStatus" AS ENUM ('Open', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnStatus" AS ENUM ('Approved', 'Rejected', 'Partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReceiptTemplate" AS ENUM ('thermal', 'a4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnReason" AS ENUM ('Defective', 'Expired', 'WrongItem', 'CustomerRequest', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReturnCondition" AS ENUM ('Good', 'Opened', 'Damaged', 'Expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransferType" AS ENUM ('Internal', 'ExternalOut', 'ExternalIn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransferStatus" AS ENUM ('Pending', 'InTransit', 'Received', 'Returned', 'PaidCash', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "POStatus" AS ENUM ('Draft', 'Sent', 'Confirmed', 'PartiallyReceived', 'Received', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── users: add permissions column if missing ─────────────────────────────────

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT '{}';

-- ── stock_counts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stock_counts" (
    "id" TEXT NOT NULL,
    "count_number" TEXT NOT NULL,
    "count_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StockCountStatus" NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_counts_count_number_key" ON "stock_counts"("count_number");
CREATE INDEX IF NOT EXISTS "stock_counts_count_date_idx" ON "stock_counts"("count_date");

ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
  NOT DEFERRABLE INITIALLY IMMEDIATE;
-- ignore if already exists
DO $$ BEGIN
  ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── stock_count_items ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stock_count_items" (
    "id" TEXT NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL DEFAULT '',
    "system_stock" INTEGER NOT NULL,
    "physical_count" INTEGER,
    "variance" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "count_id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_count_id_fkey"
    FOREIGN KEY ("count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── login_history ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "login_history" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'Login',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_history_user_id_idx" ON "login_history"("user_id");
CREATE INDEX IF NOT EXISTS "login_history_created_at_idx" ON "login_history"("created_at");

DO $$ BEGIN
  ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'System',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── app_settings ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pharmacy_name" TEXT NOT NULL DEFAULT 'My Pharmacy',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 10,
    "receipt_template" "ReceiptTemplate" NOT NULL DEFAULT 'thermal',
    "allow_line_discount" BOOLEAN NOT NULL DEFAULT true,
    "allow_bill_discount" BOOLEAN NOT NULL DEFAULT true,
    "allow_split_payment" BOOLEAN NOT NULL DEFAULT true,
    "allow_hold_sale" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- ── cash_shifts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "cash_shifts" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "cash_shifts_shift_number_key" ON "cash_shifts"("shift_number");
CREATE INDEX IF NOT EXISTS "cash_shifts_status_idx" ON "cash_shifts"("status");

-- ── cash_shift_entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "cash_shift_entries" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'in',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shift_id" TEXT NOT NULL,
    CONSTRAINT "cash_shift_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cash_shift_entries_shift_id_idx" ON "cash_shift_entries"("shift_id");

DO $$ BEGIN
  ALTER TABLE "cash_shift_entries" ADD CONSTRAINT "cash_shift_entries_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── purchase_orders: add missing columns ─────────────────────────────────────

ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "po_date" DATE NOT NULL DEFAULT CURRENT_DATE;
-- Make supplier_id optional (was NOT NULL before)
ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;

-- ── purchase_order_items: rename order_id -> purchase_order_id if needed ─────

DO $$ BEGIN
  -- Add new column purchase_order_id if it doesn't exist
  ALTER TABLE "purchase_order_items" ADD COLUMN "purchase_order_id" TEXT;
  -- Copy from order_id
  UPDATE "purchase_order_items" SET "purchase_order_id" = "order_id" WHERE "purchase_order_id" IS NULL;
  -- Make NOT NULL
  ALTER TABLE "purchase_order_items" ALTER COLUMN "purchase_order_id" SET NOT NULL;
  -- Drop FK on order_id if exists
  ALTER TABLE "purchase_order_items" DROP CONSTRAINT IF EXISTS "purchase_order_items_order_id_fkey";
  -- Add FK on new column
  ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey"
    FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  -- Make medicine_id optional
  ALTER TABLE "purchase_order_items" ALTER COLUMN "medicine_id" DROP NOT NULL;
EXCEPTION WHEN duplicate_column THEN
  -- purchase_order_id already exists, just ensure medicine_id is nullable
  ALTER TABLE "purchase_order_items" ALTER COLUMN "medicine_id" DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- ── sale_return_items: make medicine_id optional ──────────────────────────────

ALTER TABLE "sale_return_items" ALTER COLUMN "medicine_id" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "sale_return_items" DROP CONSTRAINT "sale_return_items_medicine_id_fkey";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_medicine_id_fkey"
    FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── sale_returns: change refund_method to TEXT if needed ─────────────────────

DO $$ BEGIN
  ALTER TABLE "sale_returns" ALTER COLUMN "refund_method" TYPE TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── stock_transfers: add updated_at if missing ────────────────────────────────

ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── sale_returns: add ReturnStatus enum ──────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "sale_returns" ALTER COLUMN "status" TYPE "ReturnStatus" USING status::"ReturnStatus";
EXCEPTION WHEN OTHERS THEN NULL; END $$;
