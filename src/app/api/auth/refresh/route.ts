import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { verifyToken, apiError } from "@/lib/auth";
import { UserModel } from "@/lib/models/userModel";
import { AppError, ApiResponse, JwtPayload } from "@/lib/types";
import { ADMIN_ALL_PERMISSIONS, CASHIER_DEFAULT_PERMISSIONS } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const dbUser = await UserModel.findById(user.id);
    if (!dbUser || !dbUser.isActive) return apiError("User not found or inactive", 401);

    const permissions =
      dbUser.role === "admin"
        ? ADMIN_ALL_PERMISSIONS
        : dbUser.permissions.length > 0
        ? dbUser.permissions
        : CASHIER_DEFAULT_PERMISSIONS;

    const payload: JwtPayload = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as "admin" | "cashier",
      permissions: permissions as string[],
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    } as jwt.SignOptions);

    return NextResponse.json({ success: true, data: { token } } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
