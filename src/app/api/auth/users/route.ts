import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { UserModel } from "@/lib/models/userModel";
import { AppError, ApiResponse } from "@/lib/types";

// GET /api/auth/users — admin only
export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const users = await UserModel.findAll();
    return NextResponse.json({ success: true, data: users } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

// POST /api/auth/register — admin only
export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");

    const { name, email, password, role } = await req.json();
    if (!name) return apiError("Name required", 400);
    if (!email) return apiError("Valid email required", 400);
    if (!password || password.length < 6) return apiError("Password min 6 chars", 400);
    if (!["admin", "cashier"].includes(role)) return apiError("Role must be admin or cashier", 400);

    const existing = await UserModel.findByEmail(email);
    if (existing) return apiError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return NextResponse.json(
      { success: true, message: "User registered", data: safeUser } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
