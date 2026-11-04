import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";

export interface StockCountItemData {
  id:           string;
  medicineId:   string;
  medicineName: string;
  batchNumber:  string;
  systemStock:  number;
  physicalCount: number | null;
  variance:     number;
  notes?:       string;
  medicine?:    { name: string; unit: string; category: string };
}

export interface StockCountData {
  id:          string;
  countNumber: string;
  countDate:   string;
  status:      "Draft" | "InProgress" | "Completed" | "Verified";
  notes?:      string;
  createdAt:   string;
  updatedAt:   string;
  user?:       { id: string; name: string; email: string };
  items:       StockCountItemData[];
  _count?:     { items: number };
}

export interface StockCountListResult {
  items:      StockCountData[];
  total:      number;
  page:       number;
  totalPages: number;
}

export const stockCountService = {
  async getAll(params?: { page?: number; limit?: number }): Promise<StockCountListResult> {
    return apiGet<StockCountListResult>("/stock-counts", {
      page:  params?.page,
      limit: params?.limit,
    });
  },

  async getOne(id: string): Promise<StockCountData> {
    return apiGet<StockCountData>(`/stock-counts/${id}`);
  },

  async create(): Promise<StockCountData> {
    return apiPost<StockCountData>("/stock-counts", {});
  },

  async updateItem(countId: string, medicineId: string, physicalCount: number, notes?: string): Promise<void> {
    await apiPatch(`/stock-counts/${countId}/items`, { medicineId, physicalCount, notes });
  },

  async finalize(countId: string): Promise<StockCountData> {
    return apiPatch<StockCountData>(`/stock-counts/${countId}/finalize`, {});
  },

  async delete(countId: string): Promise<void> {
    await apiDelete(`/stock-counts/${countId}`);
  },
};
