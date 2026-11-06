import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { MedicineModel } from "@/lib/models/medicineModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_READ);
    const { code } = await params;
    const medicine = await MedicineModel.findByBarcode(code.trim());
    if (!medicine) return apiError(`No medicine found for barcode: ${code}`, 404);
    return NextResponse.json({ success: true, data: medicine } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
