import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const ExpenseModel = {
  async findAll(
    query: PaginationQuery & { from?: string; to?: string }
  ): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};
    if (query.from || query.to) {
      where.date = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.expense.findMany({ where, skip, take: limit, orderBy: { date: "desc" } }),
      prisma.expense.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  create: (data: Prisma.ExpenseCreateInput) => prisma.expense.create({ data }),

  delete: (id: string) => prisma.expense.delete({ where: { id } }),

  async summary(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);

    const result = await prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    return result.map((r) => ({
      category: r.category,
      total: Number(r._sum.amount ?? 0),
    }));
  },
};
