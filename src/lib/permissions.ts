export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Medicines
  MEDICINES_READ: "medicines.read",
  MEDICINES_WRITE: "medicines.write",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",

  // Sales / POS
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_REFUND: "sales.refund",

  // Customers
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_WRITE: "customers.write",

  // Suppliers
  SUPPLIERS_READ: "suppliers.read",
  SUPPLIERS_WRITE: "suppliers.write",

  // Purchase Orders
  PURCHASE_ORDERS_READ: "purchase_orders.read",
  PURCHASE_ORDERS_WRITE: "purchase_orders.write",

  // Transfers
  TRANSFERS_READ: "transfers.read",
  TRANSFERS_WRITE: "transfers.write",

  // Returns
  RETURNS_READ: "returns.read",
  RETURNS_CREATE: "returns.create",

  // Reports
  REPORTS_VIEW: "reports.view",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_WRITE: "settings.write",

  // Stock Count
  STOCK_COUNT_VIEW: "stock_count.view",
  STOCK_COUNT_MANAGE: "stock_count.manage",

  // Login History
  LOGIN_HISTORY_VIEW: "login_history.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const CASHIER_DEFAULT_PERMISSIONS: Permission[] = [
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.MEDICINES_READ,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.RETURNS_READ,
  PERMISSIONS.RETURNS_CREATE,
];

export const ADMIN_ALL_PERMISSIONS: Permission[] = Object.values(
  PERMISSIONS
) as Permission[];

export function hasPermission(
  userRole: string,
  userPermissions: string[],
  required: Permission
): boolean {
  if (userRole === "admin") return true;
  return (
    userPermissions.includes(required) ||
    CASHIER_DEFAULT_PERMISSIONS.includes(required)
  );
}
