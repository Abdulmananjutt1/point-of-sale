import prisma from "../prisma";

export const CashShiftModel = {
  findOpen: (openedByEmail?: string) =>
    prisma.cashShift.findFirst({
      where: {
        status: "Open",
        ...(openedByEmail && {
          OR: [
            { openedBy: { endsWith: `|${openedByEmail}` } },
            { openedBy: openedByEmail },
          ],
        }),
      },
      include: { entries: { orderBy: { createdAt: "asc" } } },
      orderBy: { openTime: "desc" },
    }),

  findById: (id: string) =>
    prisma.cashShift.findUnique({ where: { id }, include: { entries: true } }),

  findAll: (openedByEmail?: string) =>
    prisma.cashShift.findMany({
      where: openedByEmail
        ? {
            OR: [
              { openedBy: { endsWith: `|${openedByEmail}` } },
              { openedBy: openedByEmail },
            ],
          }
        : undefined,
      orderBy: { openTime: "desc" },
      take: 50,
      include: { entries: true },
    }),

  async open(openedBy: string, openingBalance: number, displayName?: string) {
    const shiftNumber = `SHF-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;
    const stored = displayName ? `${displayName}|${openedBy}` : openedBy;
    return prisma.cashShift.create({
      data: { shiftNumber, openedBy: stored, openingBalance, status: "Open" },
      include: { entries: true },
    });
  },

  async close(id: string, closedBy: string, closingBalance: number, notes?: string) {
    const shift = await prisma.cashShift.findUnique({ where: { id }, include: { entries: true } });
    if (!shift) throw new Error("Shift not found");

    const cashIns = shift.entries
      .filter((e) => e.type === "in")
      .reduce((s, e) => s + Number(e.amount), 0);
    const cashOuts = shift.entries
      .filter((e) => e.type === "out")
      .reduce((s, e) => s + Number(e.amount), 0);

    const cashSalesAgg = await prisma.sale.aggregate({
      where: {
        status: "Completed",
        paymentMethod: "Cash",
        createdAt: { gte: shift.openTime },
        cashier: { email: shift.openedBy },
      },
      _sum: { total: true },
    });
    const cashSales = Number(cashSalesAgg._sum.total ?? 0);

    const expectedCash = Number(shift.openingBalance) + cashSales + cashIns - cashOuts;
    const variance = closingBalance - expectedCash;

    return prisma.cashShift.update({
      where: { id },
      data: {
        closedBy,
        closingBalance,
        expectedCash,
        variance,
        closeTime: new Date(),
        status: "Closed",
        notes,
      },
      include: { entries: true },
    });
  },

  async addEntry(shiftId: string, description: string, amount: number, type: "in" | "out") {
    return prisma.cashShiftEntry.create({ data: { shiftId, description, amount, type } });
  },
};
