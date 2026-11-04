"use client";

import { useMemo } from "react";
import { authService } from "@/services/authService";

// Mirror of backend PERMISSIONS constant
export const PERMISSIONS = {
  DASHBOARD_VIEW:        "dashboard.view",
  MEDICINES_READ:        "medicines.read",
  MEDICINES_WRITE:       "medicines.write",
  INVENTORY_VIEW:        "inventory.view",
  INVENTORY_ADJUST:      "inventory.adjust",
  SALES_CREATE:          "sales.create",
  SALES_VIEW:            "sales.view",
  SALES_REFUND:          "sales.refund",
  CUSTOMERS_READ:        "customers.read",
  CUSTOMERS_WRITE:       "customers.write",
  SUPPLIERS_READ:        "suppliers.read",
  SUPPLIERS_WRITE:       "suppliers.write",
  PURCHASE_ORDERS_READ:  "purchase_orders.read",
  PURCHASE_ORDERS_WRITE: "purchase_orders.write",
  TRANSFERS_READ:        "transfers.read",
  TRANSFERS_WRITE:       "transfers.write",
  RETURNS_READ:          "returns.read",
  RETURNS_CREATE:        "returns.create",
  REPORTS_VIEW:          "reports.view",
  SETTINGS_VIEW:         "settings.view",
  SETTINGS_WRITE:        "settings.write",
  STOCK_COUNT_VIEW:      "stock_count.view",
  STOCK_COUNT_MANAGE:    "stock_count.manage",
  LOGIN_HISTORY_VIEW:    "login_history.view",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function usePermissions() {
  const role    = authService.getRole();
  const isAdmin = role === "admin";

  const can = useMemo(() => (permission: PermissionKey): boolean => {
    // Admin has full access; cashiers have restricted access
    if (isAdmin) return true;
    // Cashier-allowed permissions
    const cashierPermissions: PermissionKey[] = [
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_WRITE,
      PERMISSIONS.RETURNS_READ,
      PERMISSIONS.RETURNS_CREATE,
      PERMISSIONS.DASHBOARD_VIEW,
    ];
    return cashierPermissions.includes(permission);
  }, [isAdmin]);

  return { can, isAdmin, role };
}
