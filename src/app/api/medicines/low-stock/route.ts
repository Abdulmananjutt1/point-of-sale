import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { MedicineModel } from "@/lib/models/medicineModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_READ);
    const threshold = Number(req.nextUrl.searchParams.get("threshold")) || 10;
    const items = await MedicineModel.findLowStock(threshold);
    return NextResponse.json({ success: true, data: items } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
