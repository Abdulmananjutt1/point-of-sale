import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { MedicineModel } from "@/lib/models/medicineModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

// GET /api/medicines/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_READ);
    const { id } = await params;
    const medicine = await MedicineModel.findById(id);
    if (!medicine) return apiError("Medicine not found", 404);
    return NextResponse.json({ success: true, data: medicine } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

// PUT /api/medicines/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_WRITE);
    const { id } = await params;
    const body = await req.json();

    const { name, sellingPrice, stock, expiryDate } = body;
    if (!name) return apiError("Medicine name is required", 400);
    if (sellingPrice !== undefined && (isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0))
      return apiError("Selling price must be a valid number", 400);
    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0))
      return apiError("Stock must be a valid number", 400);
    if (expiryDate && isNaN(Date.parse(expiryDate)))
      return apiError("Expiry date must be a valid date", 400);

    const { supplierId, expiryDate: expiry, ...rest } = body;
    const medicine = await MedicineModel.update(id, {
      ...rest,
      ...(expiry && { expiryDate: new Date(expiry) }),
      ...(supplierId && { supplier: { connect: { id: supplierId } } }),
    });
    return NextResponse.json({ success: true, message: "Medicine updated", data: medicine } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

// DELETE /api/medicines/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_WRITE);
    const { id } = await params;
    await MedicineModel.delete(id);
    return NextResponse.json({ success: true, message: "Medicine deleted" } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
