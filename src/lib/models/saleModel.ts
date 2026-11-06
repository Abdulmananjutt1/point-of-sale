import prisma from "../prisma";
import { Prisma, PaymentMethod, SaleStatus } from "@prisma/client";
import { PaginationQuery, PaginatedResponse, CreateSaleInput } from "../types";

export const SaleModel = {
  async findAll(
    query: PaginationQuery & {
      from?: string;
      to?: string;
      status?: SaleStatus;
      cashierId?: string;
    }
  ): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};
    if (query.cashierId) where.cashierId = query.cashierId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: "insensitive" } },
        { customerName: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true, customer: { select: { name: true, phone: true } } },
      }),
      prisma.sale.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) =>
    prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: { select: { name: true, unit: true } } } },
        customer: true,
      },
    }),

  async create(input: CreateSaleInput): Promise<Prisma.SaleGetPayload<{ include: { items: true } }>> {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          invoiceNumber: input.invoiceNumber,
          customerId: input.customerId,
          customerName: input.customerName ?? "Walk-in Customer",
          subtotal: input.subtotal,
          discount: input.discount ?? 0,
          tax: input.tax ?? 0,
          total: input.total,
          paymentMethod: input.paymentMethod as PaymentMethod,
          status: "Completed",
          cashierId: input.cashierId,
          cashierName: input.cashierName,
          items: {
            create: input.items.map((item) => ({
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount ?? 0,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of input.items) {
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (input.customerId) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { totalPurchases: { increment: input.total } },
        });
      }

      return sale;
    });
  },

  refund: (id: string) =>
    prisma.sale.update({ where: { id }, data: { status: "Refunded" } }),

  async todayStats(cashierId?: string): Promise<{ count: number; revenue: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.SaleWhereInput = {
      status: "Completed",
      createdAt: { gte: today },
      ...(cashierId && { cashierId }),
    };

    const result = await prisma.sale.aggregate({
      where,
      _count: { id: true },
      _sum: { total: true },
    });

    return {
      count: result._count.id,
      revenue: Number(result._sum.total ?? 0),
    };
  },
};
