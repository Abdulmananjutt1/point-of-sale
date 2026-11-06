import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { NotificationModel } from "@/lib/models/notificationModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    await NotificationModel.markAllRead(user.id);
    return NextResponse.json({ success: true, message: "All notifications marked as read" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
