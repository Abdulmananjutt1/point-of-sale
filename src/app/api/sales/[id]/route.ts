import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleModel } from "@/lib/models/saleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_VIEW);
    const { id } = await params;
    const sale = await SaleModel.findById(id);
    if (!sale) return apiError("Sale not found", 404);
    return NextResponse.json({ success: true, data: sale } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
