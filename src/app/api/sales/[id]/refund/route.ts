import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleModel } from "@/lib/models/saleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_REFUND);
    const { id } = await params;
    const sale = await SaleModel.findById(id);
    if (!sale) return apiError("Sale not found", 404);
    if (sale.status === "Refunded") return apiError("Sale already refunded", 400);
    const updated = await SaleModel.refund(id);
    return NextResponse.json({ success: true, message: "Sale refunded", data: updated } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
