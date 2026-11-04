import { StockTransfer, StockTransferItem, TransferStatus, TransferType } from "@/types";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(i: any): StockTransferItem & { id: string } {
  const qty = Number(i.quantity ?? 1);
  const price = Number(i.unitPrice ?? i.unit_price ?? 0);
  return {
    id:           i.id || `item-${Math.random()}`,
    medicineId:   i.medicineId   ?? i.medicine_id   ?? "",
    medicineName: i.medicineName ?? i.medicine_name ?? "",
    quantity:     qty,
    unitPrice:    price,
    total:        Number(i.total ?? qty * price),
    batchNumber:  i.batchNumber  ?? i.batch_number,
    expiryDate:   i.expiryDate   ?? i.expiry_date,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransfer(t: any): StockTransfer {
  return {
    id:               t.id,
    transferNumber:   t.transferNumber   ?? t.transfer_number   ?? "",
    transferType:     (t.transferType    ?? t.transfer_type     ?? "Internal") as TransferType,
    fromBranch:       t.fromBranch       ?? t.from_branch       ?? "",
    toBranch:         t.toBranch         ?? t.to_branch         ?? "",
    externalPharmacy: t.externalPharmacy ?? t.external_pharmacy,
    externalPhone:    t.externalPhone    ?? t.external_phone,
    contactPerson:    t.contactPerson    ?? t.contact_person,
    settlementType:   t.settlementType   ?? t.settlement_type   ?? "StockReturn",
    settledAmount:    t.settledAmount    != null ? Number(t.settledAmount) : undefined,
    transferDate:     t.transferDate     ?? t.transfer_date     ?? new Date().toISOString().split("T")[0],
    receiveDate:      t.receiveDate      ?? t.receive_date,
    settledDate:      t.settledDate      ?? t.settled_date,
    status:           (t.status          ?? "Pending") as TransferStatus,
    notes:            t.notes,
    initiatedBy:      t.initiatedBy      ?? t.initiated_by      ?? "Staff",
    items:            (t.items ?? []).map(mapItem),
    createdAt:        t.createdAt        ?? t.created_at        ?? new Date().toISOString(),
  };
}

export interface TransferListResult {
  transfers:  StockTransfer[];
  total:      number;
  page:       number;
  totalPages: number;
}

export const stockTransferService = {
  async getAll(params?: { search?: string; type?: string; status?: string; page?: number; limit?: number }): Promise<TransferListResult> {
    try {
      const res = await apiGet<any>("/transfers", {
        search: params?.search,
        type: params?.type,
        status: params?.status,
        page: params?.page,
        limit: params?.limit,
      });

      const items = res?.items ?? res?.data?.items ?? [];
      const total = res?.total ?? res?.data?.total ?? items.length;
      const page = res?.page ?? res?.data?.page ?? 1;
      const totalPages = res?.totalPages ?? res?.data?.totalPages ?? 1;

      return {
        transfers: items.map(mapTransfer),
        total,
        page,
        totalPages,
      };
    } catch (err) {
      console.warn("Could not fetch transfers from API, using fallback:", err);
      return {
        transfers: [],
        total: 0,
        page: 1,
        totalPages: 1,
      };
    }
  },

  async create(data: {
    transferType:      TransferType;
    fromBranch:        string;
    toBranch:          string;
    externalPharmacy?: string;
    externalPhone?:    string;
    contactPerson?:    string;
    settlementType?:   "StockReturn" | "Cash" | "Pending";
    notes?:            string;
    initiatedBy:       string;
    items: {
      medicineId?:   string;
      medicineName: string;
      quantity:     number;
      unitPrice?:   number;
      batchNumber?: string;
      expiryDate?:  string;
    }[];
  }): Promise<StockTransfer> {
    const raw = await apiPost<unknown>("/transfers", {
      ...data,
      transferDate: new Date().toISOString().split("T")[0],
    });
    return mapTransfer(raw);
  },

  async updateStatus(
    id: string,
    status: TransferStatus,
    details?: { settledType?: "StockReturn" | "Cash"; settledAmount?: number; notes?: string }
  ): Promise<StockTransfer> {
    const raw = await apiPatch<unknown>(`/transfers/${id}/status`, {
      status,
      ...details,
    });
    return mapTransfer(raw);
  },

  async receive(id: string): Promise<StockTransfer> {
    const raw = await apiPost<unknown>(`/transfers/${id}/receive`, {});
    return mapTransfer(raw);
  },
};
