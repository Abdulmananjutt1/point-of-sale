import { HeldSale, SaleItem } from "@/types";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHeldSale(h: any): HeldSale {
  return {
    id:           h.id,
    label:        h.label ?? "Held Sale",
    customerId:   h.customerId   ?? h.customer_id,
    customerName: h.customerName ?? h.customer_name ?? "Walk-in",
    discount:     Number(h.discount ?? 0),
    cart:         (h.cart ?? h.items ?? []) as SaleItem[],
    heldAt:       h.heldAt ?? h.held_at ?? new Date().toISOString(),
  };
}

export const heldSaleService = {
  // Fetch all held sales from server
  getAll: async (): Promise<HeldSale[]> => {
    const data = await apiGet<unknown[]>("/held-sales");
    return (data ?? []).map(mapHeldSale);
  },

  // Park current cart on server
  create: async (params: {
    label?: string;
    customerId?: string;
    customerName?: string;
    discount: number;
    items: SaleItem[];
  }): Promise<HeldSale> => {
    const data = await apiPost<unknown>("/held-sales", {
      label:        params.label,
      customerId:   params.customerId,
      customerName: params.customerName ?? "Walk-in",
      discount:     params.discount,
      items:        params.items,
    });
    return mapHeldSale(data);
  },

  // Discard a held sale
  remove: async (id: string): Promise<void> => {
    await apiDelete(`/held-sales/${id}`);
  },
};
