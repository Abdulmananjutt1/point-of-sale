import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");

    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const dateFilter: Prisma.SaleWhereInput =
      from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
          }
        : {};

    const saleBase: Prisma.SaleWhereInput = { status: "Completed", ...dateFilter };

    const returnDateFilter: Prisma.SaleReturnWhereInput =
      from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
          }
        : {};

    const [
      salesAgg,
      paymentBreakdown,
      topMedicines,
      customerCount,
      medicineCount,
      returnAgg,
      recentSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: saleBase,
        _count: { id: true },
        _sum: { total: true, discount: true },
      }),
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: saleBase,
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.saleItem.groupBy({
        by: ["medicineId", "medicineName"],
        where: { sale: saleBase },
        _sum: { total: true, quantity: true },
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      prisma.customer.count(),
      prisma.medicine.count(),
      prisma.saleReturn.aggregate({
        where: returnDateFilter,
        _count: { id: true },
        _sum: { refundAmount: true },
      }),
      prisma.sale.findMany({
        where: { ...dateFilter },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { items: true },
      }),
    ]);

    const totalRevenue = Number(salesAgg._sum.total ?? 0);
    const totalSales = salesAgg._count.id;
    const avgOrder = totalSales > 0 ? totalRevenue / totalSales : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalSales,
          avgOrderValue: avgOrder,
          totalDiscount: Number(salesAgg._sum.discount ?? 0),
          totalReturns: returnAgg._count.id,
          totalRefunded: Number(returnAgg._sum.refundAmount ?? 0),
          totalCustomers: customerCount,
          totalMedicines: medicineCount,
        },
        paymentBreakdown: paymentBreakdown.map((p) => ({
          method: p.paymentMethod,
          count: p._count.id,
          revenue: Number(p._sum.total ?? 0),
        })),
        topMedicines: topMedicines.map((m) => ({
          medicineId: m.medicineId,
          name: m.medicineName,
          qty: m._sum.quantity ?? 0,
          revenue: Number(m._sum.total ?? 0),
        })),
        recentSales: recentSales.map((s) => ({
          id: s.id,
          invoiceNumber: s.invoiceNumber,
          customerName: s.customerName,
          total: Number(s.total),
          discount: Number(s.discount),
          paymentMethod: s.paymentMethod,
          status: s.status,
          itemCount: s.items.length,
          createdAt: s.createdAt,
        })),
      },
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
