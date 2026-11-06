import { NextRequest, NextResponse } from "next/server";
import { verifyToken, requireRole, apiError } from "@/lib/auth";
import { SupplierModel } from "@/lib/models/supplierModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const { searchParams } = req.nextUrl;
    const result = await SupplierModel.findAll({
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
    requireRole(user, "admin");
    const body = await req.json();
    if (!body.name) return apiError("Name required", 400);
    if (!body.phone) return apiError("Phone required", 400);
    if (!body.address) return apiError("Address required", 400);

    const { contact_person, contactPerson, ...rest } = body;
    const s = await SupplierModel.create({
      ...rest,
      contactPerson: contactPerson || contact_person || "",
    });
    return NextResponse.json(
      { success: true, message: "Supplier created", data: s } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
