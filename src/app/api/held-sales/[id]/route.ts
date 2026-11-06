import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { HeldSaleModel } from "@/lib/models/heldSaleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_CREATE);
    const { id } = await params;
    const held = await HeldSaleModel.findById(id);
    if (!held) return apiError("Held sale not found", 404);

    if (held.createdBy !== user.id && user.role !== "admin")
      return apiError("Not authorized", 403);

    await HeldSaleModel.delete(id);
    return NextResponse.json({ success: true, message: "Held sale discarded" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
