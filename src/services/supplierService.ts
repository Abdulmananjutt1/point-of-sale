import { Supplier } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupplier(s: any): Supplier {
  return {
    id:            s.id,
    name:          s.name,
    contactPerson: s.contactPerson ?? s.contact_person ?? "",
    phone:         s.phone         ?? "",
    email:         s.email,
    address:       s.address       ?? "",
    createdAt:     s.createdAt     ?? s.created_at ?? new Date().toISOString(),
  };
}

export interface SupplierPayload {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
}

export const supplierService = {
  async getAll(params?: { search?: string; page?: number; limit?: number }): Promise<Supplier[]> {
    const data = await apiGet<{ items: unknown[] }>("/suppliers", {
      search: params?.search,
      page: params?.page,
      limit: params?.limit ?? 500,
    });
    return (data.items ?? []).map(mapSupplier);
  },

  async create(data: SupplierPayload): Promise<Supplier> {
    const raw = await apiPost<unknown>("/suppliers", data);
    return mapSupplier(raw);
  },

  async update(id: string, data: Partial<SupplierPayload>): Promise<Supplier> {
    const raw = await apiPut<unknown>(`/suppliers/${id}`, data);
    return mapSupplier(raw);
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/suppliers/${id}`);
  },
};
