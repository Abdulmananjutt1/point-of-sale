import prisma from "../prisma";
import { Prisma, NotificationType } from "@prisma/client";
import { PaginationQuery, PaginatedResponse } from "../types";

export const NotificationModel = {
  async findAll(
    query: PaginationQuery & { userId?: string; unreadOnly?: boolean }
  ): Promise<PaginatedResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(1000, query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};
    if (query.userId) {
      where.OR = [{ userId: query.userId }, { userId: null }];
    }
    if (query.unreadOnly) where.isRead = false;

    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById: (id: string) => prisma.notification.findUnique({ where: { id } }),

  create: (data: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string;
    data?: Prisma.InputJsonValue;
  }) => prisma.notification.create({ data }),

  markRead: (id: string) =>
    prisma.notification.update({ where: { id }, data: { isRead: true } }),

  markAllRead: (userId: string) =>
    prisma.notification.updateMany({
      where: { OR: [{ userId }, { userId: null }], isRead: false },
      data: { isRead: true },
    }),

  getUnreadCount: async (userId?: string): Promise<number> => {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }
    return prisma.notification.count({ where });
  },

  async generateSystemAlerts(): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const lowStockMeds = await prisma.medicine.findMany({
      where: { stock: { lte: 10 } },
      select: { id: true, name: true, stock: true, minStock: true },
      take: 5,
      orderBy: { stock: "asc" },
    });

    for (const med of lowStockMeds) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: "LowStock",
          data: { path: ["medicineId"], equals: med.id },
          createdAt: { gte: new Date(now.toDateString()) },
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            type: "LowStock",
            title: "Low Stock Alert",
            message: `${med.name} has only ${med.stock} units left (minimum: ${med.minStock})`,
            data: { medicineId: med.id, medicineName: med.name, stock: med.stock },
          },
        });
      }
    }

    const expiringMeds = await prisma.medicine.findMany({
      where: { expiryDate: { gte: now, lte: thirtyDaysFromNow } },
      select: { id: true, name: true, expiryDate: true },
      take: 5,
      orderBy: { expiryDate: "asc" },
    });

    for (const med of expiringMeds) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: "ExpiryAlert",
          data: { path: ["medicineId"], equals: med.id },
          createdAt: { gte: new Date(now.toDateString()) },
        },
      });
      if (!existing) {
        const daysLeft = Math.ceil(
          (med.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        await prisma.notification.create({
          data: {
            type: "ExpiryAlert",
            title: "Expiry Alert",
            message: `${med.name} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
            data: {
              medicineId: med.id,
              medicineName: med.name,
              expiryDate: med.expiryDate.toISOString(),
              daysLeft,
            },
          },
        });
      }
    }
  },
};
