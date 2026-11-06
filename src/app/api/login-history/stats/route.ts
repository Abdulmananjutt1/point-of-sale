import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { LoginHistoryModel } from "@/lib/models/loginHistoryModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const stats = await LoginHistoryModel.getStats();
    return NextResponse.json({ success: true, data: stats } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
