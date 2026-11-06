import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { CashShiftModel } from "@/lib/models/cashShiftModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const openedBy = user.role === "admin" ? undefined : user.email;
    const shift = await CashShiftModel.findOpen(openedBy);
    return NextResponse.json({ success: true, data: shift ?? null } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
