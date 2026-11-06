import prisma from "../prisma";
import { Prisma, StockCountStatus } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const StockCountModel = {
  async findAll(
    query: PaginationQuery & { status?: StockCountStatus; userId?: string }
  ): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.StockCountWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await prisma.$transaction([
      prisma.stockCount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.stockCount.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.stockCount.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { medicine: { select: { name: true, unit: true, category: true } } },
          orderBy: { medicineName: "asc" },
        },
      },
    }),

  async create(userId: string) {
    const medicines = await prisma.medicine.findMany({
      select: { id: true, name: true, batchNumber: true, stock: true },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const countNo = `CNT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;

    return prisma.stockCount.create({
      data: {
        countNumber: countNo,
        status: "InProgress",
        userId,
        items: {
          create: medicines.map((m) => ({
            medicineId: m.id,
            medicineName: m.name,
            batchNumber: m.batchNumber,
            systemStock: m.stock,
            physicalCount: null,
            variance: 0,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: { include: { medicine: { select: { name: true, unit: true } } } },
      },
    });
  },

  updateItem: (countId: string, medicineId: string, physicalCount: number, notes?: string) =>
    prisma.stockCountItem.updateMany({
      where: { countId, medicineId },
      data: { physicalCount, notes, variance: 0 },
    }),

  async finalize(id: string) {
    return prisma.$transaction(async (tx) => {
      const count = await tx.stockCount.findUnique({ where: { id }, include: { items: true } });
      if (!count) throw new Error("Stock count not found");
      if (count.status === "Verified") throw new Error("Stock count already finalized");

      for (const item of count.items) {
        if (item.physicalCount !== null) {
          const variance = item.physicalCount - item.systemStock;
          await tx.stockCountItem.update({ where: { id: item.id }, data: { variance } });
          if (variance !== 0) {
            await tx.medicine.update({
              where: { id: item.medicineId },
              data: { stock: { increment: variance } },
            });
          }
        }
      }

      return tx.stockCount.update({
        where: { id },
        data: { status: "Verified" },
        include: {
          user: { select: { id: true, name: true } },
          items: { include: { medicine: { select: { name: true, unit: true } } } },
        },
      });
    });
  },

  delete: (id: string) => prisma.stockCount.delete({ where: { id } }),
};
