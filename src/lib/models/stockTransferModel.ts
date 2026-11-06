import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const StockTransferModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.StockTransferWhereInput = query.search
      ? {
          OR: [
            { transferNumber: { contains: query.search, mode: "insensitive" } },
            { fromBranch: { contains: query.search, mode: "insensitive" } },
            { toBranch: { contains: query.search, mode: "insensitive" } },
            { externalPharmacy: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: { select: { id: true, name: true, stock: true } } } },
      },
    }),

  async create(data: {
    transferType?: string;
    fromBranch: string;
    toBranch: string;
    externalPharmacy?: string;
    externalPhone?: string;
    transferDate: Date;
    notes?: string;
    initiatedBy: string;
    items: { medicineId?: string; medicineName: string; quantity: number }[];
  }) {
    const transferNumber = `TRF-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    const transferType = data.transferType ?? "Internal";
    const isOut = transferType === "Internal" || transferType === "ExternalOut";
    const isIn = transferType === "ExternalIn";

    return prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        if (!item.medicineId) continue;
        const med = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!med) throw new Error(`Medicine not found: ${item.medicineName}`);

        if (isOut) {
          if (med.stock < item.quantity)
            throw new Error(`Insufficient stock for ${med.name} (available: ${med.stock})`);
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: { decrement: item.quantity } },
          });
        } else if (isIn) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      const initialStatus = isIn ? "Received" : "Pending";

      return tx.stockTransfer.create({
        data: {
          transferNumber,
          transferType: transferType as Prisma.EnumTransferTypeFilter["equals"],
          fromBranch: data.fromBranch,
          toBranch: data.toBranch,
          externalPharmacy: data.externalPharmacy,
          externalPhone: data.externalPhone,
          transferDate: data.transferDate,
          notes: data.notes,
          initiatedBy: data.initiatedBy,
          status: initialStatus as Prisma.EnumTransferStatusFilter["equals"],
          items: {
            create: data.items.map((i) => ({
              medicineName: i.medicineName,
              quantity: i.quantity,
              ...(i.medicineId ? { medicine: { connect: { id: i.medicineId } } } : {}),
            })),
          },
        },
        include: { items: true },
      });
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.stockTransfer.update({
      where: { id },
      data: { status: status as Prisma.EnumTransferStatusFilter["equals"] },
      include: { items: true },
    });
  },

  async receive(id: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { items: true } });
      if (!transfer) throw new Error("Transfer not found");
      if (transfer.transferType === "ExternalIn")
        throw new Error("ExternalIn transfers are auto-received on creation");

      for (const item of transfer.items) {
        if (item.medicineId) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: "Received", receiveDate: new Date() },
        include: { items: true },
      });
    });
  },
};
