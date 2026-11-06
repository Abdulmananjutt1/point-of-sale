import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { CashShiftModel } from "@/lib/models/cashShiftModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const openedBy = user.email;
    const existing = await CashShiftModel.findOpen(openedBy);
    if (existing) return apiError("You already have an open shift", 400);

    const { openingBalance } = await req.json();
    if (openingBalance === undefined || isNaN(Number(openingBalance)) || Number(openingBalance) < 0)
      return apiError("Valid opening balance required", 400);

    const displayName = user.name ?? user.email;
    const shift = await CashShiftModel.open(openedBy, Number(openingBalance), displayName);
    return NextResponse.json(
      { success: true, message: "Shift opened", data: shift } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
