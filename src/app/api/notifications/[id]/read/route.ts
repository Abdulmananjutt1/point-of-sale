import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { NotificationModel } from "@/lib/models/notificationModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const notification = await NotificationModel.findById(id);
    if (!notification) return apiError("Notification not found", 404);
    const updated = await NotificationModel.markRead(id);
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
