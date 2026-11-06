import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { StockCountModel } from "@/lib/models/stockCountModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const { searchParams } = req.nextUrl;
    const query: { page: number; limit: number; userId?: string } = {
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
    };
    if (user.role !== "admin") query.userId = user.id;
    const result = await StockCountModel.findAll(query);
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const count = await StockCountModel.create(user.id);
    return NextResponse.json(
      { success: true, message: "Stock count started", data: count } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
