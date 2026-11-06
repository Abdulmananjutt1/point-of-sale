import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { PurchaseOrderModel } from "@/lib/models/purchaseOrderModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const { searchParams } = req.nextUrl;
    const result = await PurchaseOrderModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requireRole(user, "admin");
    const body = await req.json();
    if (!body.supplierName) return apiError("Supplier name is required", 400);
    if (!body.items?.length) return apiError("At least one item is required", 400);

    const totalAmount = body.items.reduce(
      (sum: number, i: { total: number }) => sum + Number(i.total),
      0
    );

    const po = await PurchaseOrderModel.create({
      supplierId: body.supplierId?.trim() || undefined,
      supplierName: body.supplierName,
      poDate: body.poDate ? new Date(body.poDate) : new Date(),
      expectedDeliveryDate: body.expectedDeliveryDate
        ? new Date(body.expectedDeliveryDate)
        : undefined,
      status: "Draft",
      totalAmount,
      notes: body.notes?.trim() || undefined,
      items: body.items,
    });

    return NextResponse.json(
      { success: true, message: "Purchase order created", data: po } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
