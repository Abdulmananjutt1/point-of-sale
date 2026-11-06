import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { LoginHistoryModel } from "@/lib/models/loginHistoryModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const { searchParams } = req.nextUrl;
    const query: {
      page: number;
      limit: number;
      search?: string;
      action?: string;
      userId?: string;
    } = {
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      search: searchParams.get("search") ?? undefined,
      action: searchParams.get("action") ?? undefined,
    };
    if (user.role !== "admin") query.userId = user.id;
    const result = await LoginHistoryModel.findAll(query);
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
