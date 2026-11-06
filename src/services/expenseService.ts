import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";

export interface Expense {
  id:          string;
  description: string;
  amount:      number;
  category:    string;
  date:        string;
  createdAt:   string;
}

export interface ExpenseListResult {
  expenses:   Expense[];
  total:      number;
  page:       number;
  totalPages: number;
}

export interface ExpenseSummaryItem {
  category: string;
  total:    number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapExpense(e: any): Expense {
  return {
    id:          e.id,
    description: e.description ?? "",
    amount:      Number(e.amount ?? 0),
    category:    e.category    ?? "",
    date:        e.date        ?? e.createdAt ?? "",
    createdAt:   e.createdAt   ?? e.created_at ?? "",
  };
}

export const expenseService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<ExpenseListResult> {
    const data = await apiGet<{ items: unknown[]; total: number; page: number; totalPages: number }>(
      "/expenses",
      {
        page:  params?.page,
        limit: params?.limit,
        from:  params?.from,
        to:    params?.to,
      }
    );
    return {
      expenses:   (data.items ?? []).map(mapExpense),
      total:      data.total      ?? 0,
      page:       data.page       ?? 1,
      totalPages: data.totalPages ?? 1,
    };
  },

  async create(data: {
    description: string;
    amount:      number;
    category:    string;
    date:        string;
  }): Promise<Expense> {
    const raw = await apiPost<unknown>("/expenses", data);
    return mapExpense(raw);
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/expenses/${id}`);
  },

  async getSummary(params?: {
    year?:  number;
    month?: number;
  }): Promise<ExpenseSummaryItem[]> {
    return apiGet<ExpenseSummaryItem[]>("/expenses/summary", {
      year:  params?.year,
      month: params?.month,
    });
  },
};
