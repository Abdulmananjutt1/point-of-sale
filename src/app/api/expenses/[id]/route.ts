import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { ExpenseModel } from "@/lib/models/expenseModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    await ExpenseModel.delete(id).catch(() => {
      throw new AppError("Expense not found", 404);
    });
    return NextResponse.json({ success: true, message: "Expense deleted" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
