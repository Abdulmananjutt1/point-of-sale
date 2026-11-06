import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { UserModel } from "@/lib/models/userModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const dbUser = await UserModel.findById(user.id);
    if (!dbUser || !dbUser.isActive) return apiError("User not found or inactive", 401);

    const { passwordHash: _, ...safeUser } = dbUser;
    return NextResponse.json({ success: true, data: safeUser } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
