import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { PurchaseOrderModel } from "@/lib/models/purchaseOrderModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    const { items } = await req.json();
    if (!items?.length) return apiError("Items are required", 400);
    const po = await PurchaseOrderModel.receiveGoods(id, items);
    return NextResponse.json({
      success: true,
      message: "Goods received and stock updated",
      data: po,
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
