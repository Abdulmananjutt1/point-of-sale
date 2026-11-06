import { Medicine } from "@/types";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMedicine(m: any): Medicine {
  return {
    id:                   m.id,
    name:                 m.name,
    genericName:          m.genericName        ?? m.generic_name        ?? "",
    brand:                m.brand              ?? "",
    category:             m.category           ?? "Other",
    barcode:              m.barcode            ?? undefined,
    batchNumber:          m.batchNumber        ?? m.batch_number        ?? "",
    expiryDate:           typeof m.expiryDate === "string"
                            ? m.expiryDate
                            : new Date(m.expiryDate ?? m.expiry_date).toISOString(),
    purchasePrice:        Number(m.purchasePrice ?? m.purchase_price    ?? 0),
    sellingPrice:         Number(m.sellingPrice  ?? m.selling_price     ?? 0),
    stock:                Number(m.stock         ?? 0),
    minStock:             Number(m.minStock      ?? m.min_stock         ?? 0),
    unit:                 m.unit                ?? "Pcs",
    supplierId:           m.supplierId          ?? m.supplier_id        ?? "",
    requiresPrescription: m.requiresPrescription ?? m.requires_prescription ?? false,
    description:          m.description         ?? "",
    isActive:             m.isActive            ?? m.is_active          ?? true,
    createdAt:            m.createdAt           ?? m.created_at         ?? new Date().toISOString(),
    updatedAt:            m.updatedAt           ?? m.updated_at         ?? new Date().toISOString(),
    mrp:             m.mrp,
    tradePrice:      m.tradePrice   ?? m.trade_price,
    taxRate:         m.taxRate      ?? m.tax_rate,
    defaultDiscount: m.defaultDiscount ?? m.default_discount,
    strength:        m.strength,
    packSize:        m.packSize     ?? m.pack_size,
    form:            m.form,
    shelfLocation:   m.shelfLocation ?? m.shelf_location,
    maxStock:        m.maxStock      ?? m.max_stock,
    isControlled:    m.isControlled  ?? m.is_controlled,
    isColdChain:     m.isColdChain   ?? m.is_cold_chain,
  };
}

export interface MedicineListResult {
  medicines: Medicine[];
  total: number;
  page: number;
  totalPages: number;
}

export const medicineService = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<MedicineListResult> {
    const data = await apiGet<{ items: unknown[]; total: number; page: number; totalPages: number }>(
      "/medicines",
      {
        search:    params?.search,
        page:      params?.page,
        limit:     params?.limit,
        sortBy:    params?.sortBy,
        sortOrder: params?.sortOrder,
      }
    );
    return {
      medicines:  (data.items ?? []).map(mapMedicine),
      total:      data.total      ?? 0,
      page:       data.page       ?? 1,
      totalPages: data.totalPages ?? 1,
    };
  },

  async create(data: Omit<Medicine, "id" | "createdAt" | "updatedAt">): Promise<Medicine> {
    const payload = {
      ...data,
      supplierId: data.supplierId?.trim() || undefined,
    };
    const raw = await apiPost<unknown>("/medicines", payload);
    return mapMedicine(raw);
  },

  async update(id: string, data: Partial<Medicine>): Promise<Medicine> {
    const payload = {
      ...data,
      supplierId: data.supplierId?.trim() || undefined,
    };
    const raw = await apiPut<unknown>(`/medicines/${id}`, payload);
    return mapMedicine(raw);
  },

  async adjustStock(id: string, adjustment: number): Promise<Medicine> {
    const raw = await apiPatch<unknown>(`/medicines/${id}/stock`, { adjustment });
    return mapMedicine(raw);
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/medicines/${id}`);
  },

  // Fast barcode lookup — calls dedicated backend endpoint
  async findByBarcode(barcode: string): Promise<Medicine> {
    const raw = await apiGet<unknown>(`/medicines/barcode/${encodeURIComponent(barcode)}`);
    return mapMedicine(raw);
  },
};
