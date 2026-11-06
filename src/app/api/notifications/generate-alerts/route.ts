import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { NotificationModel } from "@/lib/models/notificationModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    await NotificationModel.generateSystemAlerts();
    return NextResponse.json({ success: true, message: "System alerts generated" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
