import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { StockTransferModel } from "@/lib/models/stockTransferModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const { status } = await req.json();
    const valid = ["Pending", "InTransit", "Received", "Rejected"];
    if (!valid.includes(status)) return apiError("Invalid status", 422);
    const transfer = await StockTransferModel.updateStatus(id, status);
    return NextResponse.json({ success: true, message: "Status updated", data: transfer } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
