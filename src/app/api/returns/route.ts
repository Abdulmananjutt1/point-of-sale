import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleReturnModel } from "@/lib/models/saleReturnModel";
import { SaleModel } from "@/lib/models/saleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.RETURNS_READ);
    const { searchParams } = req.nextUrl;
    const result = await SaleReturnModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.RETURNS_CREATE);
    const { saleId, items, refundMethod, notes } = await req.json();

    if (!saleId) throw new AppError("Sale ID is required", 422);
    if (!items?.length) throw new AppError("At least one item is required", 422);

    const sale = await SaleModel.findById(saleId);
    if (!sale) throw new AppError("Sale not found", 404);
    if (sale.status === "Refunded") throw new AppError("Sale already refunded", 400);

    const itemsToReturn = items.filter((i: { returnQuantity: number }) => i.returnQuantity > 0);
    if (!itemsToReturn.length) throw new AppError("Select at least one item to return", 422);

    for (const item of itemsToReturn) {
      const saleItem = sale.items.find(
        (si: { medicineId: string }) => si.medicineId === item.medicineId
      );
      if (saleItem && item.returnQuantity > saleItem.quantity) {
        throw new AppError(
          `Return qty for ${item.medicineName} exceeds sold qty`,
          422
        );
      }
    }

    const refundAmount = itemsToReturn.reduce(
      (sum: number, i: { returnQuantity: number; unitPrice: number }) =>
        sum + i.returnQuantity * Number(i.unitPrice),
      0
    );

    const ret = await SaleReturnModel.create({
      saleId,
      invoiceNumber: sale.invoiceNumber,
      returnDate: new Date(),
      reason: itemsToReturn[0]?.reason ?? "CustomerRequest",
      notes: notes?.trim() || undefined,
      refundAmount,
      refundMethod: refundMethod ?? "Cash",
      status: "Approved",
      items: itemsToReturn,
    });

    return NextResponse.json(
      { success: true, message: "Return processed", data: ret } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
