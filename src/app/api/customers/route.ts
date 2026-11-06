import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requirePermission, apiError } from "@/lib/auth";
import { CustomerModel } from "@/lib/models/customerModel";
import { AppError, ApiResponse } from "@/lib/types";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = verifyToken(req);
    requirePermission(user, PERMISSIONS.CUSTOMERS_READ);
    const { searchParams } = req.nextUrl;
    const result = await CustomerModel.findAll({
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 10,
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
    requirePermission(user, PERMISSIONS.CUSTOMERS_READ); // cashier can create
    const body = await req.json();
    if (!body.name) return apiError("Name required", 400);
    if (!body.phone) return apiError("Phone required", 400);
    const c = await CustomerModel.create(body);
    return NextResponse.json(
      { success: true, message: "Customer created", data: c } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
