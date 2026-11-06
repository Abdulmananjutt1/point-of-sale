import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { role } = await params;
    if (!["admin", "cashier"].includes(role)) return apiError("Invalid role", 400);

    const permissions = await prisma.permission.findMany({
      include: { rolePermissions: { where: { role: role as Role } } },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    const formatted = permissions.map((perm) => ({
      id: perm.id,
      name: perm.name,
      description: perm.description,
      module: perm.module,
      action: perm.action,
      isGranted: perm.rolePermissions.length > 0 && perm.rolePermissions[0].isGranted,
    }));

    return NextResponse.json({ success: true, data: formatted } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ role: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { role } = await params;
    if (!["admin", "cashier"].includes(role)) return apiError("Invalid role", 400);

    const { permissions } = await req.json();

    if (role === "admin") {
      const managePermission = await prisma.permission.findFirst({
        where: { name: "manage_permissions" },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const removingManage = permissions.some((p: any) => p.permissionId === managePermission?.id && !p.isGranted);
      if (removingManage) return apiError("Cannot remove manage_permissions from admin role", 400);
    }

    await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const { permissionId, isGranted } of permissions as any[]) {
        await tx.rolePermission.upsert({
          where: { role_permissionId: { role: role as Role, permissionId } },
          update: { isGranted },
          create: { role: role as Role, permissionId, isGranted },
        });
      }
    });

    return NextResponse.json({ success: true, message: "Permissions updated successfully" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
