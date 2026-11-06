-- CreateTable: held_sales for Hold Sale feature
CREATE TABLE "held_sales" (
    "id"            TEXT NOT NULL,
    "label"         TEXT NOT NULL,
    "customer_id"   TEXT,
    "customer_name" TEXT NOT NULL DEFAULT 'Walk-in',
    "discount"      DECIMAL(12,2) NOT NULL DEFAULT 0,
    "items"         JSONB NOT NULL DEFAULT '[]',
    "held_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"    TEXT NOT NULL,

    CONSTRAINT "held_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "held_sales_held_at_idx" ON "held_sales"("held_at");
CREATE INDEX "held_sales_created_by_idx" ON "held_sales"("created_by");
