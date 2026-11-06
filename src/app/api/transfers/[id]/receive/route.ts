import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/types";

interface DbItemRow {
  id: string;
  transfer_id: string;
  medicine_id: string | null;
  medicine_name: string;
  quantity: number;
  unit_price: string | number;
  total: string | number;
  batch_number: string | null;
  expiry_date: Date | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;

    await prisma.$executeRawUnsafe(
      `UPDATE stock_transfers 
       SET status = 'Received'::"TransferStatus",
           receive_date = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      id
    );

    const items = await prisma.$queryRawUnsafe<DbItemRow[]>(
      `SELECT * FROM stock_transfer_items WHERE transfer_id = $1`, id
    );

    for (const it of items) {
      if (it.medicine_id) {
        await prisma.medicine.updateMany({
          where: { id: it.medicine_id },
          data: { stock: { increment: Number(it.quantity) } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Transfer received and stock added",
    });
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    console.error("[POST /api/transfers/:id/receive]", err);
    return apiError("Database receive error", 500);
  }
}
