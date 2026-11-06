import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { StockTransferModel } from "@/lib/models/stockTransferModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const t = await StockTransferModel.findById(id);
    if (!t) return apiError("Transfer not found", 404);
    return NextResponse.json({ success: true, data: t } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
