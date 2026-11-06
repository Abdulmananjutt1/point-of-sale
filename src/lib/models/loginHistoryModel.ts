import prisma from "../prisma";
import { PaginationQuery, PaginatedResponse } from "../types";
import { Prisma } from "@prisma/client";

export const LoginHistoryModel = {
  async findAll(
    query: PaginationQuery & { userId?: string; action?: string }
  ): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.LoginHistoryWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.search) {
      where.OR = [
        { user: { name: { contains: query.search, mode: "insensitive" } } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
        { ipAddress: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.loginHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.loginHistory.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  create: (data: {
    userId: string;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    status?: string;
  }) => prisma.loginHistory.create({ data }),

  getStats: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, today_count, failed] = await prisma.$transaction([
      prisma.loginHistory.count({ where: { action: "Login" } }),
      prisma.loginHistory.count({ where: { action: "Login", createdAt: { gte: today } } }),
      prisma.loginHistory.count({ where: { status: "failed" } }),
    ]);

    return { total, today: today_count, failed };
  },
};
