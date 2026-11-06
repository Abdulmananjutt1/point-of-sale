import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const CustomerModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) => prisma.customer.findUnique({ where: { id } }),

  create: (data: Prisma.CustomerCreateInput) => prisma.customer.create({ data }),

  update: (id: string, data: Prisma.CustomerUpdateInput) =>
    prisma.customer.update({ where: { id }, data }),

  delete: (id: string) => prisma.customer.delete({ where: { id } }),
};
