import prisma from "../prisma";
import { Prisma } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const PurchaseOrderModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = query.search
      ? {
          OR: [
            { poNumber: { contains: query.search, mode: "insensitive" } },
            { supplierName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true, supplier: { select: { id: true, name: true } } },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: { select: { id: true, name: true } } } },
        supplier: { select: { id: true, name: true } },
      },
    }),

  async create(data: {
    supplierId?: string;
    supplierName: string;
    poDate: Date;
    expectedDeliveryDate?: Date;
    status: string;
    totalAmount: number;
    notes?: string;
    items: {
      medicineId?: string;
      medicineName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
  }) {
    const poNumber = `PO-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    return prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierName: data.supplierName,
        poDate: data.poDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        status: data.status as Prisma.EnumPOStatusFilter["equals"],
        totalAmount: data.totalAmount,
        notes: data.notes,
        ...(data.supplierId ? { supplier: { connect: { id: data.supplierId } } } : {}),
        items: {
          create: data.items.map((i) => ({
            medicineName: i.medicineName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
            receivedQuantity: 0,
            ...(i.medicineId ? { medicine: { connect: { id: i.medicineId } } } : {}),
          })),
        },
      },
      include: { items: true },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: status as Prisma.EnumPOStatusFilter["equals"] },
      include: { items: true },
    });
  },

  async receiveGoods(
    id: string,
    items: {
      id: string;
      receivedQuantity: number;
      batchNumber?: string;
      expiryDate?: string;
    }[]
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        const existing = await tx.purchaseOrderItem.findUnique({ where: { id: item.id } });
        if (!existing) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: item.receivedQuantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          },
        });

        if (existing.medicineId && item.receivedQuantity > 0) {
          await tx.medicine.update({
            where: { id: existing.medicineId },
            data: { stock: { increment: item.receivedQuantity } },
          });
        }
      }

      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      const allReceived = po?.items.every((i) => i.receivedQuantity >= i.quantity);
      const newStatus = allReceived ? "Received" : "PartiallyReceived";

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus as Prisma.EnumPOStatusFilter["equals"] },
        include: { items: true },
      });
    });
  },

  delete: (id: string) => prisma.purchaseOrder.delete({ where: { id } }),
};
