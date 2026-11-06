import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { SettingsModel } from "@/lib/models/settingsModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const settings = await SettingsModel.get();
    return NextResponse.json({ success: true, data: settings } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const body = await req.json();
    const settings = await SettingsModel.update(body);
    return NextResponse.json({ success: true, message: "Settings updated", data: settings } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
