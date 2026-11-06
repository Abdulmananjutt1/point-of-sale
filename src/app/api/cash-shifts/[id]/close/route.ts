import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { CashShiftModel } from "@/lib/models/cashShiftModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    const { id } = await params;
    const { closingBalance, notes } = await req.json();

    if (closingBalance === undefined || isNaN(Number(closingBalance)) || Number(closingBalance) < 0)
      return apiError("Valid closing balance required", 400);

    const shift = await CashShiftModel.findById(id);
    if (!shift) return apiError("Shift not found", 404);
    if (shift.status === "Closed") return apiError("Shift already closed", 400);

    if (user.role !== "admin") {
      const email = user.email;
      const owns = shift.openedBy === email || shift.openedBy.endsWith(`|${email}`);
      if (!owns) return apiError("You can only close your own shift", 403);
    }

    const closedByName = user.name ?? user.email;
    const closed = await CashShiftModel.close(id, closedByName, Number(closingBalance), notes);
    return NextResponse.json({ success: true, message: "Shift closed", data: closed } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
