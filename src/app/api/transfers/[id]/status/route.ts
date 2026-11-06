import { NextRequest, NextResponse } from "next/server";
import { verifyToken, apiError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/types";

interface DbTransferRow {
  id: string;
  transfer_number: string;
  transfer_type: "Internal" | "ExternalOut" | "ExternalIn";
  from_branch: string;
  to_branch: string;
  external_pharmacy: string | null;
  external_phone: string | null;
  contact_person: string | null;
  settlement_type: string | null;
  settled_amount: string | number | null;
  transfer_date: Date;
  receive_date: Date | null;
  settled_date: Date | null;
  status: "Pending" | "InTransit" | "Received" | "Returned" | "PaidCash" | "Rejected";
  notes: string | null;
  initiated_by: string;
  created_at: Date;
  updated_at: Date;
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyToken(req);
    const { id } = await params;
    const { status, settledType, settledAmount, notes } = await req.json();

    const existing = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers WHERE id = $1`, id
    );
    if (!existing || existing.length === 0) return apiError("Transfer record not found", 404);

    const current = existing[0];
    const oldStatus = current.status;

    await prisma.$executeRawUnsafe(
      `UPDATE stock_transfers 
       SET status = $1::"TransferStatus",
           settlement_type = COALESCE($2, settlement_type),
           settled_amount = COALESCE($3, settled_amount),
           settled_date = CASE WHEN $1 IN ('Returned', 'PaidCash', 'Received') THEN NOW() ELSE settled_date END,
           notes = CASE WHEN $4 IS NOT NULL THEN COALESCE(notes || ' | ', '') || $4 ELSE notes END,
           updated_at = NOW()
       WHERE id = $5`,
      status, settledType ?? null,
      settledAmount != null ? Number(settledAmount) : null,
      notes ?? null, id
    );

    const items = await prisma.$queryRawUnsafe<DbItemRow[]>(
      `SELECT * FROM stock_transfer_items WHERE transfer_id = $1`, id
    );

    if (current.transfer_type === "ExternalOut" && oldStatus === "Pending" && status === "Returned") {
      for (const it of items) {
        if (it.medicine_id) {
          await prisma.medicine.updateMany({
            where: { id: it.medicine_id },
            data: { stock: { increment: Number(it.quantity) } },
          });
        }
      }
    }

    if (current.transfer_type === "ExternalIn" && oldStatus === "Pending" && status === "Returned") {
      for (const it of items) {
        if (it.medicine_id) {
          await prisma.medicine.updateMany({
            where: { id: it.medicine_id },
            data: { stock: { decrement: Number(it.quantity) } },
          });
        }
      }
    }

    const updated = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers WHERE id = $1`, id
    );

    const row = updated[0];
    const formatted = {
      id: row.id,
      transferNumber: row.transfer_number,
      transferType: row.transfer_type,
      fromBranch: row.from_branch,
      toBranch: row.to_branch,
      status: row.status,
      notes: row.notes ?? undefined,
      items: items.map((it) => ({
        id: it.id,
        medicineId: it.medicine_id ?? "",
        medicineName: it.medicine_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        total: Number(it.total),
      })),
    };

    return NextResponse.json({ success: true, message: `Status updated to ${status}`, data: formatted, ...formatted });
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    console.error("[PATCH /api/transfers/:id/status]", err);
    return apiError("Database update error", 500);
  }
}
