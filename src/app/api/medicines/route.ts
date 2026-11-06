import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { MedicineModel } from "@/lib/models/medicineModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

// GET /api/medicines
export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_READ);

    const { searchParams } = req.nextUrl;
    const result = await MedicineModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    });

    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

// POST /api/medicines
export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.MEDICINES_WRITE);

    const body = await req.json();
    const { name, sellingPrice, stock, expiryDate } = body;

    if (!name) return apiError("Medicine name is required", 400);
    if (sellingPrice === undefined || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0)
      return apiError("Selling price must be a valid number", 400);
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0)
      return apiError("Stock must be a valid number", 400);
    if (!expiryDate || isNaN(Date.parse(expiryDate)))
      return apiError("Expiry date must be a valid date", 400);

    const { supplierId, expiryDate: expiry, ...rest } = body;
    const medicine = await MedicineModel.create({
      ...rest,
      expiryDate: new Date(expiry),
      ...(supplierId && { supplier: { connect: { id: supplierId } } }),
    });

    return NextResponse.json(
      { success: true, message: "Medicine created", data: medicine } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
