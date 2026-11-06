-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_role_idx" ON "role_permissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_permission_id_key" ON "role_permissions"("role", "permission_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_key" ON "user_permissions"("user_id", "permission_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default permissions
INSERT INTO "permissions" ("id", "name", "description", "module", "action") VALUES
-- Dashboard
(gen_random_uuid(), 'view_dashboard', 'View dashboard and analytics', 'dashboard', 'view'),

-- Medicines
(gen_random_uuid(), 'view_medicines', 'View medicines list', 'medicines', 'view'),
(gen_random_uuid(), 'create_medicine', 'Add new medicine', 'medicines', 'create'),
(gen_random_uuid(), 'edit_medicine', 'Edit medicine details', 'medicines', 'edit'),
(gen_random_uuid(), 'delete_medicine', 'Delete medicine', 'medicines', 'delete'),

-- Sales
(gen_random_uuid(), 'view_sales', 'View sales history', 'sales', 'view'),
(gen_random_uuid(), 'create_sale', 'Create new sale', 'sales', 'create'),
(gen_random_uuid(), 'void_sale', 'Void/cancel sale', 'sales', 'delete'),

-- Customers
(gen_random_uuid(), 'view_customers', 'View customers list', 'customers', 'view'),
(gen_random_uuid(), 'create_customer', 'Add new customer', 'customers', 'create'),
(gen_random_uuid(), 'edit_customer', 'Edit customer details', 'customers', 'edit'),
(gen_random_uuid(), 'delete_customer', 'Delete customer', 'customers', 'delete'),

-- Suppliers
(gen_random_uuid(), 'view_suppliers', 'View suppliers list', 'suppliers', 'view'),
(gen_random_uuid(), 'create_supplier', 'Add new supplier', 'suppliers', 'create'),
(gen_random_uuid(), 'edit_supplier', 'Edit supplier details', 'suppliers', 'edit'),
(gen_random_uuid(), 'delete_supplier', 'Delete supplier', 'suppliers', 'delete'),

-- Purchase Orders
(gen_random_uuid(), 'view_purchase_orders', 'View purchase orders', 'purchase_orders', 'view'),
(gen_random_uuid(), 'create_purchase_order', 'Create purchase order', 'purchase_orders', 'create'),
(gen_random_uuid(), 'edit_purchase_order', 'Edit purchase order', 'purchase_orders', 'edit'),
(gen_random_uuid(), 'delete_purchase_order', 'Delete purchase order', 'purchase_orders', 'delete'),

-- Returns
(gen_random_uuid(), 'view_returns', 'View returns', 'returns', 'view'),
(gen_random_uuid(), 'create_return', 'Process return', 'returns', 'create'),

-- Stock Count
(gen_random_uuid(), 'view_stock_count', 'View stock counts', 'stock_count', 'view'),
(gen_random_uuid(), 'create_stock_count', 'Create stock count', 'stock_count', 'create'),
(gen_random_uuid(), 'edit_stock_count', 'Edit stock count', 'stock_count', 'edit'),

-- Transfers
(gen_random_uuid(), 'view_transfers', 'View stock transfers', 'transfers', 'view'),
(gen_random_uuid(), 'create_transfer', 'Create stock transfer', 'transfers', 'create'),
(gen_random_uuid(), 'edit_transfer', 'Edit stock transfer', 'transfers', 'edit'),
(gen_random_uuid(), 'delete_transfer', 'Delete stock transfer', 'transfers', 'delete'),

-- Expenses
(gen_random_uuid(), 'view_expenses', 'View expenses', 'expenses', 'view'),
(gen_random_uuid(), 'create_expense', 'Add expense', 'expenses', 'create'),
(gen_random_uuid(), 'edit_expense', 'Edit expense', 'expenses', 'edit'),
(gen_random_uuid(), 'delete_expense', 'Delete expense', 'expenses', 'delete'),

-- Reports
(gen_random_uuid(), 'view_reports', 'View reports', 'reports', 'view'),
(gen_random_uuid(), 'export_reports', 'Export reports', 'reports', 'export'),

-- Settings
(gen_random_uuid(), 'view_settings', 'View settings', 'settings', 'view'),
(gen_random_uuid(), 'edit_settings', 'Edit settings', 'settings', 'edit'),

-- Users & Permissions
(gen_random_uuid(), 'view_users', 'View users list', 'users', 'view'),
(gen_random_uuid(), 'create_user', 'Create new user', 'users', 'create'),
(gen_random_uuid(), 'edit_user', 'Edit user details', 'users', 'edit'),
(gen_random_uuid(), 'delete_user', 'Delete user', 'users', 'delete'),
(gen_random_uuid(), 'manage_permissions', 'Manage role permissions', 'permissions', 'manage');

-- Grant all permissions to admin role by default
INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_granted")
SELECT gen_random_uuid(), 'admin', "id", true FROM "permissions";

-- Grant basic permissions to cashier role
INSERT INTO "role_permissions" ("id", "role", "permission_id", "is_granted")
SELECT gen_random_uuid(), 'cashier', "id", true FROM "permissions" 
WHERE "name" IN (
    'view_dashboard',
    'view_medicines',
    'view_sales',
    'create_sale',
    'view_customers',
    'create_customer'
);
