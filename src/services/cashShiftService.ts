import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";

export interface ShiftEntry {
  id:          string;
  description: string;
  amount:      number;
  type:        "in" | "out";
  createdAt:   string;
}

export interface CashShift {
  id:             string;
  shiftNumber:    string;
  openedBy:       string;
  closedBy?:      string;
  openTime:       string;
  closeTime?:     string;
  openingBalance: number;
  closingBalance?: number;
  expectedCash?:   number;
  variance?:       number;
  status:         "Open" | "Closed";
  notes?:         string;
  entries:        ShiftEntry[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShift(s: any): CashShift {
  if (!s) return null as any;
  return {
    id:             s.id,
    shiftNumber:    s.shiftNumber    ?? s.shift_number    ?? "",
    openedBy:       s.openedBy       ?? s.opened_by       ?? "Cashier Staff",
    closedBy:       s.closedBy       ?? s.closed_by,
    openTime:       s.openTime       ?? s.open_time       ?? new Date().toISOString(),
    closeTime:      s.closeTime      ?? s.close_time,
    openingBalance: Number(s.openingBalance ?? s.opening_balance ?? 0),
    closingBalance: s.closingBalance != null ? Number(s.closingBalance ?? s.closing_balance) : undefined,
    expectedCash:   s.expectedCash   != null ? Number(s.expectedCash  ?? s.expected_cash)   : undefined,
    variance:       s.variance       != null ? Number(s.variance)      : undefined,
    status:         s.status         ?? "Open",
    notes:          s.notes,
    entries:        (s.entries ?? []).map((e: any) => ({
      id:          e.id,
      description: e.description,
      amount:      Number(e.amount),
      type:        e.type as "in" | "out",
      createdAt:   e.createdAt ?? e.created_at ?? "",
    })),
  };
}

export const cashShiftService = {
  async getCurrent(): Promise<CashShift | null> {
    try {
      const data = await apiGet<unknown>("/cash-shifts/current");
      return data ? mapShift(data) : null;
    } catch {
      // Fallback to local storage if endpoint doesn't exist
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("pharmapos_active_shift");
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }
      }
      return null;
    }
  },

  async open(openingBalance: number): Promise<CashShift> {
    try {
      const raw = await apiPost<unknown>("/cash-shifts/open", { openingBalance });
      return mapShift(raw);
    } catch {
      const shift: CashShift = {
        id: "SHF-" + Date.now(),
        shiftNumber: "SHF-" + String(Date.now()).slice(-6),
        openedBy: "Cashier Staff",
        openTime: new Date().toISOString(),
        openingBalance,
        status: "Open",
        entries: [],
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("pharmapos_active_shift", JSON.stringify(shift));
      }
      return shift;
    }
  },

  async close(id: string, closingBalance: number, notes?: string): Promise<CashShift> {
    try {
      const raw = await apiPatch<unknown>(`/cash-shifts/${id}/close`, { closingBalance, notes });
      return mapShift(raw);
    } catch {
      let shift: CashShift = {
        id,
        shiftNumber: id,
        openedBy: "Cashier Staff",
        openTime: new Date().toISOString(),
        closeTime: new Date().toISOString(),
        openingBalance: 0,
        closingBalance,
        status: "Closed",
        notes,
        entries: [],
      };
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("pharmapos_active_shift");
        if (raw) {
          try {
            shift = {
              ...JSON.parse(raw),
              closingBalance,
              closeTime: new Date().toISOString(),
              status: "Closed",
              notes,
            };
          } catch {}
        }
        localStorage.removeItem("pharmapos_active_shift");
      }
      return shift;
    }
  },

  async addEntry(id: string, description: string, amount: number, type: "in" | "out"): Promise<ShiftEntry> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await apiPost<any>(`/cash-shifts/${id}/entries`, { description, amount, type });
      return {
        id: raw.id,
        description: raw.description,
        amount: Number(raw.amount),
        type: raw.type,
        createdAt: raw.createdAt ?? "",
      };
    } catch {
      const entry: ShiftEntry = {
        id: "ENT-" + Date.now(),
        description,
        amount,
        type,
        createdAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("pharmapos_active_shift");
        if (raw) {
          try {
            const shift = JSON.parse(raw);
            shift.entries = [...(shift.entries || []), entry];
            localStorage.setItem("pharmapos_active_shift", JSON.stringify(shift));
          } catch {}
        }
      }
      return entry;
    }
  },
};
