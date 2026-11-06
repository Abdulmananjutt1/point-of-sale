import prisma from "../prisma";
import { Prisma, PaymentMethod } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const SaleReturnModel = {
  async findAll(query: PaginationQuery): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Prisma.SaleReturnWhereInput = query.search
      ? {
          OR: [
            { returnNumber: { contains: query.search, mode: "insensitive" } },
            { invoiceNumber: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.saleReturn.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true, sale: { select: { invoiceNumber: true, customerName: true } } },
      }),
      prisma.saleReturn.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.saleReturn.findUnique({
      where: { id },
      include: {
        items: true,
        sale: { select: { invoiceNumber: true, customerName: true, total: true } },
      },
    }),

  async create(data: {
    saleId: string;
    invoiceNumber: string;
    returnDate: Date;
    reason: string;
    notes?: string;
    refundAmount: number;
    refundMethod: string;
    status: string;
    items: {
      medicineId?: string;
      medicineName: string;
      saleQuantity: number;
      returnQuantity: number;
      unitPrice: number;
      reason: string;
      condition: string;
    }[];
  }) {
    const returnNumber = `RET-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    return prisma.$transaction(async (tx) => {
      const ret = await tx.saleReturn.create({
        data: {
          returnNumber,
          invoiceNumber: data.invoiceNumber,
          returnDate: data.returnDate,
          reason: data.reason,
          notes: data.notes,
          refundAmount: data.refundAmount,
          refundMethod: data.refundMethod as PaymentMethod,
          status: data.status as Prisma.EnumReturnStatusFilter["equals"],
          sale: { connect: { id: data.saleId } },
          items: {
            create: data.items.map((i) => ({
              medicineName: i.medicineName,
              saleQuantity: i.saleQuantity,
              returnQuantity: i.returnQuantity,
              unitPrice: i.unitPrice,
              reason: i.reason as Prisma.EnumReturnReasonFilter["equals"],
              condition: i.condition as Prisma.EnumReturnConditionFilter["equals"],
              ...(i.medicineId ? { medicine: { connect: { id: i.medicineId } } } : {}),
            })),
          },
        },
        include: { items: true },
      });

      for (const item of data.items) {
        if (item.condition === "Good" && item.medicineId && item.returnQuantity > 0) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: { increment: item.returnQuantity } },
          });
        }
      }

      await tx.sale.update({ where: { id: data.saleId }, data: { status: "Refunded" } });

      return ret;
    });
  },

  async todayStats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [total, todayReturns] = await prisma.$transaction([
      prisma.saleReturn.count(),
      prisma.saleReturn.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { refundAmount: true },
      }),
    ]);
    const totalAmount = await prisma.saleReturn.aggregate({ _sum: { refundAmount: true } });
    return {
      total,
      today: todayReturns.length,
      totalAmount: Number(totalAmount._sum.refundAmount ?? 0),
    };
  },
};
