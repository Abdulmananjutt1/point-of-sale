import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleReturnModel } from "@/lib/models/saleReturnModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.RETURNS_READ);
    const { id } = await params;
    const ret = await SaleReturnModel.findById(id);
    if (!ret) return apiError("Return not found", 404);
    return NextResponse.json({ success: true, data: ret } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
