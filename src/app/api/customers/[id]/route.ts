import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { CustomerModel } from "@/lib/models/customerModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.CUSTOMERS_READ);
    const { id } = await params;
    const c = await CustomerModel.findById(id);
    if (!c) return apiError("Customer not found", 404);
    return NextResponse.json({ success: true, data: c } satisfies ApiResponse);
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
    requirePermission(user, PERMISSIONS.CUSTOMERS_WRITE);
    const { id } = await params;
    const body = await req.json();
    if (!body.name) return apiError("Name required", 400);
    if (!body.phone) return apiError("Phone required", 400);
    const c = await CustomerModel.update(id, body);
    return NextResponse.json({ success: true, message: "Customer updated", data: c } satisfies ApiResponse);
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
    requirePermission(user, PERMISSIONS.CUSTOMERS_WRITE);
    const { id } = await params;
    await CustomerModel.delete(id).catch(() => {
      throw new AppError("Customer not found", 404);
    });
    return NextResponse.json({ success: true, message: "Customer deleted" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
