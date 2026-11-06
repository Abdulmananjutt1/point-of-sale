import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { AppError, ApiResponse } from "@/lib/types";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: grouped } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
