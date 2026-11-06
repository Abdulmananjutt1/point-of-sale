import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { CashShiftModel } from "@/lib/models/cashShiftModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    const { id } = await params;
    const { description, amount, type } = await req.json();

    if (!description) return apiError("Description is required", 422);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return apiError("Amount must be greater than 0", 422);
    if (!["in", "out"].includes(type)) return apiError("Type must be 'in' or 'out'", 422);

    const shift = await CashShiftModel.findById(id);
    if (!shift) return apiError("Shift not found", 404);
    if (shift.status === "Closed") return apiError("Cannot add entry to closed shift", 400);

    if (user.role !== "admin") {
      const email = user.email;
      const owns = shift.openedBy === email || shift.openedBy.endsWith(`|${email}`);
      if (!owns) return apiError("You can only add entries to your own shift", 403);
    }

    const entry = await CashShiftModel.addEntry(id, description, Number(amount), type);
    return NextResponse.json(
      { success: true, message: "Entry added", data: entry } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
