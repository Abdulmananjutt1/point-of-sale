import { apiGet } from "@/lib/apiClient";

export interface LoginHistoryEntry {
  id:        string;
  action:    string;
  ipAddress: string | null;
  userAgent: string | null;
  status:    string;
  createdAt: string;
  user: {
    id:    string;
    name:  string;
    email: string;
    role:  string;
  };
}

export interface LoginHistoryResult {
  items:      LoginHistoryEntry[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface LoginHistoryStats {
  total:  number;
  today:  number;
  failed: number;
}

export const loginHistoryService = {
  async getAll(params?: {
    page?:   number;
    limit?:  number;
    search?: string;
    action?: string;
  }): Promise<LoginHistoryResult> {
    return apiGet<LoginHistoryResult>("/login-history", {
      page:   params?.page,
      limit:  params?.limit,
      search: params?.search,
      action: params?.action,
    });
  },

  async getStats(): Promise<LoginHistoryStats> {
    return apiGet<LoginHistoryStats>("/login-history/stats");
  },
};
