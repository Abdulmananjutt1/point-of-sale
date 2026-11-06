import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        customPermissions: { include: { permission: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const allPermissions = await prisma.permission.findMany();
    const rolePermissions = await prisma.rolePermission.findMany({ include: { permission: true } });

    const formatted = users.map((u) => {
      const userRolePerms = rolePermissions.filter((rp) => rp.role === u.role);
      const permissionStatus = allPermissions.map((perm) => {
        const customPerm = u.customPermissions.find((up) => up.permissionId === perm.id);
        if (customPerm) return { permissionId: perm.id, name: perm.name, isGranted: customPerm.isGranted, source: "custom" };
        const rolePerm = userRolePerms.find((rp) => rp.permissionId === perm.id);
        return { permissionId: perm.id, name: perm.name, isGranted: rolePerm?.isGranted ?? false, source: "role" };
      });
      return { id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt, permissions: permissionStatus };
    });

    return NextResponse.json({ success: true, data: formatted } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
