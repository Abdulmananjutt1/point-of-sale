import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { SaleModel } from "@/lib/models/saleModel";
import { AppError, ApiResponse, CreateSaleInput } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";
import { SaleStatus } from "@prisma/client";

function generateInvoiceNumber(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${yy}${mm}${dd}-${rnd}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.SALES_VIEW);
    const { searchParams } = req.nextUrl;
    const cashierId = user.role === "admin" ? undefined : user.id;
    const result = await SaleModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
      search: searchParams.get("search") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      status: (searchParams.get("status") as SaleStatus) ?? undefined,
      cashierId,
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
    requirePermission(user, PERMISSIONS.SALES_CREATE);
    const body = await req.json();

    if (!body.items?.length) return apiError("At least one item required", 400);
    if (!body.paymentMethod) return apiError("Payment method required", 400);
    if (body.total === undefined || isNaN(Number(body.total)) || Number(body.total) < 0)
      return apiError("Valid total required", 400);

    const input: CreateSaleInput = {
      ...body,
      invoiceNumber: generateInvoiceNumber("INV"),
      cashierId: user.id,
      cashierName: user.name ?? user.email,
    };

    const sale = await SaleModel.create(input);
    return NextResponse.json(
      { success: true, message: "Sale completed", data: sale } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
