import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── App Settings ─────────────────────────────────────────────────────────────
  await prisma.appSettings.upsert({
    where:  { id: 1 },
    update: {},
    create: {
      id:                1,
      pharmacyName:      "Al-Shifa Pharmacy",
      address:           "Shop 12, Main Market, Gulshan-e-Iqbal, Karachi",
      phone:             "021-34567890",
      taxRate:           0,
      invoicePrefix:     "INV",
      currency:          "PKR",
      lowStockThreshold: 10,
      receiptTemplate:   "thermal",
      allowLineDiscount: true,
      allowBillDiscount: true,
      allowSplitPayment: true,
      allowHoldSale:     true,
    },
  });

  // ── Admin user ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where:  { email: "admin@pharmapos.com" },
    update: { passwordHash: adminHash, role: "admin", isActive: true },
    create: {
      name:         "Dr. Ahmed Ali",
      email:        "admin@pharmapos.com",
      passwordHash: adminHash,
      role:         "admin",
    },
  });

  // ── Cashier user ──────────────────────────────────────────────────────────────
  const cashierHash = await bcrypt.hash("cashier123", 12);
  await prisma.user.upsert({
    where:  { email: "cashier@pharmapos.com" },
    update: { passwordHash: cashierHash, role: "cashier", isActive: true },
    create: {
      name:         "Fatima Malik",
      email:        "cashier@pharmapos.com",
      passwordHash: cashierHash,
      role:         "cashier",
    },
  });

  console.log("✅ Seeding complete!");
  console.log("   Admin   → admin@pharmapos.com   / admin123");
  console.log("   Cashier → cashier@pharmapos.com / cashier123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
