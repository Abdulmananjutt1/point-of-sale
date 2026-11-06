import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import { StockTransferModel } from "@/lib/models/stockTransferModel";
import { AppError, ApiResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const { searchParams } = req.nextUrl;
    const result = await StockTransferModel.findAll({
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
    const body = await req.json();
    if (!body.fromBranch) return apiError("From branch is required", 400);
    if (!body.toBranch) return apiError("To branch is required", 400);
    if (!body.items?.length) return apiError("At least one item is required", 400);
    if (body.fromBranch === body.toBranch)
      return apiError("Source and destination cannot be the same", 422);

    const transfer = await StockTransferModel.create({
      transferType: body.transferType,
      fromBranch: body.fromBranch,
      toBranch: body.toBranch,
      externalPharmacy: body.externalPharmacy,
      externalPhone: body.externalPhone,
      transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
      notes: body.notes?.trim() || undefined,
      initiatedBy: body.initiatedBy ?? user.name ?? "Admin",
      items: body.items,
    });

    return NextResponse.json(
      { success: true, message: "Transfer initiated", data: transfer } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
