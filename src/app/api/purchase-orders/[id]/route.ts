import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { PurchaseOrderModel } from "@/lib/models/purchaseOrderModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const po = await PurchaseOrderModel.findById(id);
    if (!po) return apiError("Purchase order not found", 404);
    return NextResponse.json({ success: true, data: po } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    const po = await PurchaseOrderModel.findById(id);
    if (!po) return apiError("Purchase order not found", 404);
    if (po.status !== "Draft") return apiError("Only Draft orders can be deleted", 422);
    await PurchaseOrderModel.delete(id);
    return NextResponse.json({ success: true, message: "Purchase order deleted" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
