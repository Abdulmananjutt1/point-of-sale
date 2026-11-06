import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

function mapTransfer(row: DbTransferRow, items: DbItemRow[]) {
  return {
    id: row.id,
    transferNumber: row.transfer_number,
    transferType: row.transfer_type,
    fromBranch: row.from_branch,
    toBranch: row.to_branch,
    externalPharmacy: row.external_pharmacy ?? undefined,
    externalPhone: row.external_phone ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    settlementType: (row.settlement_type ?? "StockReturn") as "StockReturn" | "Cash",
    settledAmount: row.settled_amount != null ? Number(row.settled_amount) : undefined,
    transferDate: row.transfer_date
      ? row.transfer_date.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    receiveDate: row.receive_date ? row.receive_date.toISOString() : undefined,
    settledDate: row.settled_date ? row.settled_date.toISOString() : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
    items: items.map((it) => ({
      id: it.id,
      medicineId: it.medicine_id ?? "",
      medicineName: it.medicine_name,
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unit_price ?? 0),
      total: Number(it.total ?? Number(it.quantity ?? 1) * Number(it.unit_price ?? 0)),
      batchNumber: it.batch_number ?? undefined,
      expiryDate: it.expiry_date ? it.expiry_date.toISOString().split("T")[0] : undefined,
    })),
  };
}

// GET /api/transfers
export async function GET(req: NextRequest) {
  try {
    verifyToken(req);
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const rows = await prisma.$queryRawUnsafe<DbTransferRow[]>(
      `SELECT * FROM stock_transfers ORDER BY created_at DESC`
    );

    let filtered = rows;
    if (type && type !== "All") filtered = filtered.filter((r) => r.transfer_type === type);
    if (status && status !== "All") filtered = filtered.filter((r) => r.status === status);
    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.transfer_number.toLowerCase().includes(q) ||
          (r.external_pharmacy && r.external_pharmacy.toLowerCase().includes(q)) ||
          (r.contact_person && r.contact_person.toLowerCase().includes(q)) ||
          (r.from_branch && r.from_branch.toLowerCase().includes(q)) ||
          (r.to_branch && r.to_branch.toLowerCase().includes(q)) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const transferIds = paginated.map((r) => r.id);
    let items: DbItemRow[] = [];
    if (transferIds.length > 0) {
      const inClause = transferIds.map((id) => `'${id}'`).join(",");
      items = await prisma.$queryRawUnsafe<DbItemRow[]>(
        `SELECT * FROM stock_transfer_items WHERE transfer_id IN (${inClause})`
      );
    }

    const itemMap = new Map<string, DbItemRow[]>();
    for (const item of items) {
      const arr = itemMap.get(item.transfer_id) || [];
      arr.push(item);
      itemMap.set(item.transfer_id, arr);
    }

    const results = paginated.map((r) => mapTransfer(r, itemMap.get(r.id) || []));

    return NextResponse.json({
      success: true,
      data: { items: results, total, page, totalPages },
      items: results,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    console.error("[GET /api/transfers]", err);
    return apiError("Database error fetching transfers", 500);
  }
}

// POST /api/transfers
export async function POST(req: NextRequest) {
  try {
    const user = verifyToken(req);
    const body = await req.json();

    const id = crypto.randomUUID();
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) FROM stock_transfers`
    );
    const seq = Number(countResult[0]?.count ?? 0) + 1;
    const yearShort = String(new Date().getFullYear()).slice(-2);
    const transferNumber =
      body.transferNumber || `TRF-${yearShort}${String(seq).padStart(4, "0")}`;

    const transferType = body.transferType || "ExternalIn";
    const fromBranch = body.fromBranch || (transferType === "ExternalIn" ? body.externalPharmacy : "Main Pharmacy");
    const toBranch = body.toBranch || (transferType === "ExternalOut" ? body.externalPharmacy : "Main Pharmacy");
    const externalPharmacy = body.externalPharmacy || null;
    const externalPhone = body.externalPhone || null;
    const contactPerson = body.contactPerson || null;
    const settlementType = body.settlementType || "StockReturn";
    const status = body.status || "Pending";
    const notes = body.notes || null;
    const initiatedBy = body.initiatedBy || user?.name || "Admin Staff";

    await prisma.$executeRawUnsafe(
      `INSERT INTO stock_transfers (
        id, transfer_number, transfer_type, from_branch, to_branch,
        external_pharmacy, external_phone, contact_person, settlement_type,
        status, notes, initiated_by, transfer_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3::"TransferType", $4, $5,
        $6, $7, $8, $9,
        $10::"TransferStatus", $11, $12, NOW(), NOW(), NOW()
      )`,
      id, transferNumber, transferType, fromBranch, toBranch,
      externalPharmacy, externalPhone, contactPerson, settlementType,
      status, notes, initiatedBy
    );

    const items = body.items || [];
    const insertedItems: DbItemRow[] = [];

    for (const it of items) {
      const itemId = crypto.randomUUID();
      const medId = it.medicineId && it.medicineId.length > 5 ? it.medicineId : null;
      const medName = it.medicineName || "Medicine";
      const quantity = Math.max(1, Number(it.quantity || 1));
      const unitPrice = Number(it.unitPrice || 0);
      const total = quantity * unitPrice;

      await prisma.$executeRawUnsafe(
        `INSERT INTO stock_transfer_items (id, transfer_id, medicine_id, medicine_name, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        itemId, id, medId, medName, quantity, unitPrice, total
      );

      insertedItems.push({
        id: itemId, transfer_id: id, medicine_id: medId, medicine_name: medName,
        quantity, unit_price: unitPrice, total, batch_number: null, expiry_date: null,
      });

      if (medId) {
        if (transferType === "ExternalIn") {
          await prisma.medicine.updateMany({ where: { id: medId }, data: { stock: { increment: quantity } } });
        } else if (transferType === "ExternalOut") {
          await prisma.medicine.updateMany({ where: { id: medId }, data: { stock: { decrement: quantity } } });
        }
      }
    }

    const createdRow: DbTransferRow = {
      id, transfer_number: transferNumber, transfer_type: transferType,
      from_branch: fromBranch, to_branch: toBranch, external_pharmacy: externalPharmacy,
      external_phone: externalPhone, contact_person: contactPerson,
      settlement_type: settlementType, settled_amount: null,
      transfer_date: new Date(), receive_date: null, settled_date: null,
      status, notes, initiated_by: initiatedBy, created_at: new Date(), updated_at: new Date(),
    };

    const formatted = mapTransfer(createdRow, insertedItems);
    return NextResponse.json(
      { success: true, message: "Transfer recorded", data: formatted, ...formatted },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AppError) return apiError(err.message, err.statusCode);
    console.error("[POST /api/transfers]", err);
    return apiError("Failed to save transfer", 500);
  }
}
