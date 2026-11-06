import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { UserModel } from "@/lib/models/userModel";
import { AppError, ApiResponse } from "@/lib/types";

// PUT /api/auth/users/:id — admin only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");

    const { id } = await params;
    const { name, email, password, role } = await req.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (name !== undefined) {
      if (!name) return apiError("Name cannot be empty", 400);
      updateData.name = name.trim();
    }
    if (email !== undefined) {
      if (!email) return apiError("Valid email required", 400);
      updateData.email = email.trim().toLowerCase();
    }
    if (password !== undefined) {
      if (password.length < 6) return apiError("Password min 6 chars", 400);
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (role !== undefined) {
      if (!["admin", "cashier"].includes(role)) return apiError("Role must be admin or cashier", 400);
      updateData.role = role;
    }

    const updated = await UserModel.update(id, updateData);
    const { passwordHash: _, ...safeUser } = updated;
    return NextResponse.json({ success: true, message: "User updated", data: safeUser } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

// DELETE /api/auth/users/:id — admin only (deactivates)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    await UserModel.deactivate(id);
    return NextResponse.json({ success: true, message: "User deactivated" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
