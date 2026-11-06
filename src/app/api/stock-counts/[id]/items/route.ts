import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { StockCountModel } from "@/lib/models/stockCountModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const { medicineId, physicalCount, notes } = await req.json();
    if (typeof physicalCount !== "number" || physicalCount < 0)
      return apiError("physicalCount must be a non-negative number", 400);
    await StockCountModel.updateItem(id, medicineId, physicalCount, notes);
    return NextResponse.json({ success: true, message: "Item updated" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
