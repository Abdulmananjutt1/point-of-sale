import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { StockTransferModel } from "@/lib/models/stockTransferModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const transfer = await StockTransferModel.receive(id);
    return NextResponse.json({
      success: true,
      message: "Transfer received — stock updated",
      data: transfer,
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
