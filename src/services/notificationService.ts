import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";

export interface Notification {
  id:        string;
  type:      "LowStock" | "ExpiryAlert" | "ReturnProcessed" | "PurchaseOrder" | "System";
  title:     string;
  message:   string;
  isRead:    boolean;
  data?:     Record<string, unknown>;
  createdAt: string;
  userId?:   string;
}

export interface NotificationListResult {
  items:      Notification[];
  total:      number;
  page:       number;
  totalPages: number;
}

export const notificationService = {
  async getAll(params?: { page?: number; limit?: number; unread?: boolean }): Promise<NotificationListResult> {
    return apiGet<NotificationListResult>("/notifications", {
      page:   params?.page,
      limit:  params?.limit,
      unread: params?.unread ? "true" : undefined,
    });
  },

  async getUnreadCount(): Promise<number> {
    const data = await apiGet<{ count: number }>("/notifications/unread-count");
    return data.count;
  },

  async markRead(id: string): Promise<void> {
    await apiPatch(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await apiPost("/notifications/mark-all-read", {});
  },

  async generateAlerts(): Promise<void> {
    await apiPost("/notifications/generate-alerts", {});
  },
};
