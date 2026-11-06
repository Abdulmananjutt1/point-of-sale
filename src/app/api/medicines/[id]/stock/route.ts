import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { MedicineModel } from "@/lib/models/medicineModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

// PATCH /api/medicines/:id/stock
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.INVENTORY_ADJUST);
    const { id } = await params;
    const { adjustment } = await req.json();

    if (!Number.isInteger(adjustment)) return apiError("Integer adjustment required", 400);

    const medicine = await MedicineModel.adjustStock(id, adjustment);
    return NextResponse.json({ success: true, message: "Stock adjusted", data: medicine } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
