import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { SupplierModel } from "@/lib/models/supplierModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const s = await SupplierModel.findById(id);
    if (!s) return apiError("Supplier not found", 404);
    return NextResponse.json({ success: true, data: s } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    const body = await req.json();
    if (!body.name) return apiError("Name required", 400);
    if (!body.phone) return apiError("Phone required", 400);
    if (!body.address) return apiError("Address required", 400);

    const { contact_person, contactPerson, ...rest } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { ...rest };
    if (contactPerson !== undefined || contact_person !== undefined) {
      payload.contactPerson = contactPerson || contact_person || "";
    }
    const s = await SupplierModel.update(id, payload);
    return NextResponse.json({ success: true, message: "Supplier updated", data: s } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const { id } = await params;
    await SupplierModel.delete(id).catch(() => {
      throw new AppError("Supplier not found", 404);
    });
    return NextResponse.json({ success: true, message: "Supplier deleted" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
