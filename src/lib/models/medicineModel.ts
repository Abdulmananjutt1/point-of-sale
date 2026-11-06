import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const MedicineModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { genericName: { contains: query.search, mode: "insensitive" } },
            { brand: { contains: query.search, mode: "insensitive" } },
            { barcode: { contains: query.search, mode: "insensitive" } },
            { batchNumber: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const validSortFields = ["name", "category", "stock", "expiryDate", "sellingPrice"];
    const sortBy = validSortFields.includes(query.sortBy ?? "") ? query.sortBy! : "name";
    const orderBy = { [sortBy]: query.sortOrder ?? "asc" } as Prisma.MedicineOrderByWithRelationInput;

    const [items, total] = await prisma.$transaction([
      prisma.medicine.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { supplier: { select: { name: true } } },
      }),
      prisma.medicine.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.medicine.findUnique({
      where: { id },
      include: { supplier: { select: { id: true, name: true } } },
    }),

  findByBarcode: (barcode: string) =>
    prisma.medicine.findUnique({
      where: { barcode },
      include: { supplier: { select: { id: true, name: true } } },
    }),

  findLowStock: (threshold: number) =>
    prisma.medicine.findMany({
      where: { stock: { lte: threshold } },
      orderBy: { stock: "asc" },
    }),

  findExpiring: (days: number) => {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return prisma.medicine.findMany({
      where: { expiryDate: { gte: new Date(), lte: future } },
      orderBy: { expiryDate: "asc" },
    });
  },

  create: (data: Prisma.MedicineCreateInput) => prisma.medicine.create({ data }),

  update: (id: string, data: Prisma.MedicineUpdateInput) =>
    prisma.medicine.update({ where: { id }, data }),

  adjustStock: (id: string, adjustment: number) =>
    prisma.medicine.update({
      where: { id },
      data: { stock: { increment: adjustment } },
    }),

  delete: (id: string) => prisma.medicine.delete({ where: { id } }),
};
