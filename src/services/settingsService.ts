import { apiGet, apiPut, apiPost } from "@/lib/apiClient";

export interface BackendSettings {
  id:                number;
  pharmacyName:      string;
  address:           string;
  phone:             string;
  taxRate:           number;
  invoicePrefix:     string;
  currency:          string;
  lowStockThreshold: number;
  receiptTemplate:   "thermal" | "a4";
  allowLineDiscount: boolean;
  allowBillDiscount: boolean;
  allowSplitPayment: boolean;
  allowHoldSale:     boolean;
}

export interface BackendUser {
  id:        string;
  name:      string;
  email:     string;
  role:      "admin" | "cashier";
  isActive:  boolean;
  createdAt: string;
}

export const settingsService = {
  async get(): Promise<BackendSettings> {
    return apiGet<BackendSettings>("/settings");
  },

  async update(data: Partial<BackendSettings>): Promise<BackendSettings> {
    return apiPut<BackendSettings>("/settings", data);
  },

  async getUsers(): Promise<BackendUser[]> {
    return apiGet<BackendUser[]>("/auth/users");
  },

  async createUser(data: { name: string; email: string; password: string; role: "admin" | "cashier" }): Promise<BackendUser> {
    return apiPost<BackendUser>("/auth/register", data);
  },
};
