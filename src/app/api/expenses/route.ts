import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { ExpenseModel } from "@/lib/models/expenseModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const { searchParams } = req.nextUrl;
    const result = await ExpenseModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    verifyToken(req);
    const body = await req.json();
    if (!body.description) return apiError("Description required", 400);
    if (!body.amount || isNaN(Number(body.amount)) || Number(body.amount) < 0.01)
      return apiError("Valid amount required", 400);
    if (!body.category) return apiError("Category required", 400);
    if (!body.date || isNaN(Date.parse(body.date))) return apiError("Valid date required", 400);

    const { date, ...rest } = body;
    const expense = await ExpenseModel.create({ ...rest, date: new Date(date) });
    return NextResponse.json(
      { success: true, message: "Expense logged", data: expense } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
