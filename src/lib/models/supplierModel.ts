import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const SupplierModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { contactPerson: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
      prisma.supplier.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.supplier.findUnique({
      where: { id },
      include: { medicines: { select: { id: true, name: true, stock: true } } },
    }),

  create: (data: Prisma.SupplierCreateInput) => prisma.supplier.create({ data }),

  update: (id: string, data: Prisma.SupplierUpdateInput) =>
    prisma.supplier.update({ where: { id }, data }),

  delete: (id: string) => prisma.supplier.delete({ where: { id } }),
};
