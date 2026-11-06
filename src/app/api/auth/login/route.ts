import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "@/lib/models/userModel";
import { LoginHistoryModel } from "@/lib/models/loginHistoryModel";
import { AppError, ApiResponse, JwtPayload } from "@/lib/types";
import { ADMIN_ALL_PERMISSIONS, CASHIER_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { apiError } from "@/lib/auth";

function buildToken(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}): string {
  const permissions =
    user.role === "admin"
      ? ADMIN_ALL_PERMISSIONS
      : user.permissions.length > 0
      ? user.permissions
      : CASHIER_DEFAULT_PERMISSIONS;

  const payload: JwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "admin" | "cashier",
    permissions: permissions as string[],
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  } as jwt.SignOptions);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const user = await UserModel.findByEmail(email);
    if (!user) return apiError("Invalid email or password", 401);
    if (!user.isActive) return apiError("Account is inactive", 403);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      await LoginHistoryModel.create({
        userId: user.id,
        action: "Login",
        ipAddress,
        userAgent,
        status: "failed",
      }).catch(() => {});
      return apiError("Invalid email or password", 401);
    }

    await LoginHistoryModel.create({
      userId: user.id,
      action: "Login",
      ipAddress,
      userAgent,
      status: "success",
    }).catch(() => {});

    const token = buildToken(user);

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
      },
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    console.error("[POST /api/auth/login]", err);
    return apiError("Internal server error", 500);
  }
}
