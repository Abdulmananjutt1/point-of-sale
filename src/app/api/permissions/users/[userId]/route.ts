import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { userId } = await params;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { customPermissions: { include: { permission: true } } },
    });
    if (!dbUser) return apiError("User not found", 404);

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: dbUser.role },
      include: { permission: true },
    });

    const permissionMap = new Map();
    rolePermissions.forEach((rp) => {
      permissionMap.set(rp.permission.id, { ...rp.permission, isGranted: rp.isGranted, source: "role" });
    });
    dbUser.customPermissions.forEach((up) => {
      permissionMap.set(up.permission.id, { ...up.permission, isGranted: up.isGranted, source: "custom" });
    });

    return NextResponse.json({ success: true, data: Array.from(permissionMap.values()) } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { userId } = await params;
    const { permissions } = await req.json();

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) return apiError("User not found", 404);

    if (dbUser.role === "admin") {
      const managePermission = await prisma.permission.findFirst({ where: { name: "manage_permissions" } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const removingManage = permissions.some((p: any) => p.permissionId === managePermission?.id && !p.isGranted);
      if (removingManage) return apiError("Cannot remove manage_permissions from admin users", 400);
    }

    await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const { permissionId, isGranted } of permissions as any[]) {
        await tx.userPermission.upsert({
          where: { userId_permissionId: { userId, permissionId } },
          update: { isGranted },
          create: { userId, permissionId, isGranted },
        });
      }
    });

    return NextResponse.json({ success: true, message: "User permissions updated successfully" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
