import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleModel } from "@/lib/models/saleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_VIEW);
    const cashierId = user.role === "admin" ? undefined : user.id;
    const stats = await SaleModel.todayStats(cashierId);
    return NextResponse.json({ success: true, data: stats } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
