import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    verifyToken(req);
    const { userId } = await params;
    const permission = req.nextUrl.searchParams.get("permission");
    if (!permission) return apiError("Permission name required", 400);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { customPermissions: { include: { permission: true } } },
    });
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ success: true, data: { hasPermission: false } } satisfies ApiResponse);
    }

    const perm = await prisma.permission.findUnique({ where: { name: permission } });
    if (!perm) {
      return NextResponse.json({ success: true, data: { hasPermission: false } } satisfies ApiResponse);
    }

    const customPerm = dbUser.customPermissions.find((up) => up.permissionId === perm.id);
    if (customPerm) {
      return NextResponse.json({ success: true, data: { hasPermission: customPerm.isGranted } } satisfies ApiResponse);
    }

    const rolePerm = await prisma.rolePermission.findUnique({
      where: { role_permissionId: { role: dbUser.role, permissionId: perm.id } },
    });

    return NextResponse.json({
      success: true,
      data: { hasPermission: rolePerm?.isGranted ?? false },
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
