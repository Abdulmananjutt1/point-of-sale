import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { HeldSaleModel } from "@/lib/models/heldSaleModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHeldSale(h: any) {
  return {
    id: h.id,
    label: h.label,
    customerId: h.customerId ?? h.customer_id,
    customerName: h.customerName ?? h.customer_name ?? "Walk-in",
    discount: Number(h.discount ?? 0),
    cart: Array.isArray(h.items) ? h.items : [],
    heldAt: h.heldAt ?? h.held_at,
    createdBy: h.createdBy ?? h.created_by,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_CREATE);
    const rows = await HeldSaleModel.findAll(user.role === "admin" ? undefined : user.id);
    return NextResponse.json({ success: true, data: rows.map(mapHeldSale) } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_CREATE);
    const { label, customerId, customerName, discount, items } = await req.json();

    if (!Array.isArray(items) || items.length === 0)
      return apiError("Cart items are required", 400);

    const held = await HeldSaleModel.create({
      label: label || `Hold ${new Date().toLocaleTimeString()}`,
      customerId,
      customerName: customerName ?? "Walk-in",
      discount: Number(discount ?? 0),
      items,
      createdBy: user.id,
    });

    return NextResponse.json(
      { success: true, message: "Sale held successfully", data: mapHeldSale(held) } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
