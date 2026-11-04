"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  ArrowLeftRight,
  PackageCheck,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowUpFromLine,
  ArrowDownToLine,
  Phone,
  User,
  Printer,
  FileText,
  DollarSign,
  Building2,
  Handshake,
  X,
  Clock,
  Layers,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { StockTransfer, TransferStatus, TransferType, Medicine, StockTransferItem } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { stockTransferService } from "@/services/stockTransferService";
import { medicineService } from "@/services/medicineService";
import { usePharmacyStore } from "@/store";

const STATUS_VARIANT: Record<
  TransferStatus,
  "success" | "warning" | "danger" | "info" | "default"
> = {
  Pending:   "warning",
  InTransit: "info",
  Received:  "success",
  Returned:  "success",
  PaidCash:  "info",
  Rejected:  "danger",
};

const TYPE_CONFIG: Record<
  TransferType,
  {
    label: string;
    sub: string;
    color: string;
    icon: React.ElementType;
    desc: string;
  }
> = {
  ExternalIn: {
    label: "Inward (Borrowed)",
    sub: "Borrowed from external pharmacy",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: ArrowDownToLine,
    desc: "Borrowed medicine from a partner pharmacy for patient prescription",
  },
  ExternalOut: {
    label: "Outward (Lent)",
    sub: "Lent to external pharmacy",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: ArrowUpFromLine,
    desc: "Lent medicine from your counter to a neighbouring pharmacy runner",
  },
  Internal: {
    label: "Branch Transfer",
    sub: "Inter-branch logistics",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: Building2,
    desc: "Stock movement between your own pharmacy branches",
  },
};

const SUGGESTED_STORES = [
  "Al-Madina Medicos",
  "Bismillah Chemist",
  "Bilal Pharmacy",
  "Shaheen Chemist",
  "Shifa Medicos",
  "City Medical Store",
  "Awan Chemist",
  "Khan Pharmacy",
];

const BRANCHES = ["Main Pharmacy", "Branch 2 (Saddar)", "Branch 3 (Commercial Mkt)"];

const EMPTY_ITEM: StockTransferItem = {
  medicineId: "",
  medicineName: "",
  quantity: 1,
  unitPrice: 0,
  total: 0,
};

export default function TransfersPage() {
  const { settings, currentUser } = usePharmacyStore();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransferType | "All">("All");
  const [onlyPending, setOnlyPending] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleRecord, setSettleRecord] = useState<StockTransfer | null>(null);
  const [settleMode, setSettleMode] = useState<"Returned" | "PaidCash">("Returned");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleNotes, setSettleNotes] = useState("");

  // Form State
  const [transferType, setTransferType] = useState<TransferType>("ExternalIn");
  const [form, setForm] = useState({
    fromBranch: BRANCHES[0],
    toBranch: "",
    externalPharmacy: "",
    contactPerson: "",
    externalPhone: "",
    settlementType: "StockReturn" as "StockReturn" | "Cash",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trResult, medResult] = await Promise.all([
        stockTransferService.getAll({ limit: 300 }),
        medicineService.getAll({ limit: 500 }),
      ]);
      setTransfers(trResult.transfers);
      setMedicines(medResult.medicines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── KPI Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const borrowedPending = transfers.filter(
      (t) => t.transferType === "ExternalIn" && t.status === "Pending"
    );
    const lentPending = transfers.filter(
      (t) => t.transferType === "ExternalOut" && t.status === "Pending"
    );
    const branchTransfers = transfers.filter((t) => t.transferType === "Internal");
    const settled = transfers.filter((t) =>
      ["Returned", "PaidCash", "Received"].includes(t.status)
    );

    const borrowedValue = borrowedPending.reduce(
      (sum, t) => sum + t.items.reduce((iSum, it) => iSum + (it.total || it.quantity * (it.unitPrice || 0)), 0),
      0
    );
    const lentValue = lentPending.reduce(
      (sum, t) => sum + t.items.reduce((iSum, it) => iSum + (it.total || it.quantity * (it.unitPrice || 0)), 0),
      0
    );

    return {
      borrowedCount: borrowedPending.length,
      borrowedValue,
      lentCount: lentPending.length,
      lentValue,
      branchCount: branchTransfers.length,
      settledCount: settled.length,
    };
  }, [transfers]);

  // ── Filtered Transfers ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transfers.filter((t) => {
      if (onlyPending && !["Pending", "InTransit"].includes(t.status)) {
        return false;
      }
      if (typeFilter !== "All" && t.transferType !== typeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.transferNumber.toLowerCase().includes(q) ||
        (t.externalPharmacy && t.externalPharmacy.toLowerCase().includes(q)) ||
        (t.contactPerson && t.contactPerson.toLowerCase().includes(q)) ||
        (t.externalPhone && t.externalPhone.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.fromBranch.toLowerCase().includes(q) ||
        t.toBranch.toLowerCase().includes(q) ||
        t.items.some((i) => i.medicineName.toLowerCase().includes(q))
      );
    });
  }, [transfers, search, typeFilter, onlyPending]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, onlyPending]);

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // ── Form Helpers ───────────────────────────────────────────────────────────
  const updateItem = (idx: number, field: keyof StockTransferItem, value: any) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[idx], [field]: value };

      if (field === "medicineId") {
        const med = medicines.find((m) => m.id === value);
        if (med) {
          item.medicineName = med.name;
          item.unitPrice = med.sellingPrice;
          item.total = item.quantity * med.sellingPrice;
          item.batchNumber = med.batchNumber;
          item.expiryDate = med.expiryDate;
        }
      }

      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? Number(value) : item.quantity;
        const p = field === "unitPrice" ? Number(value) : (item.unitPrice || 0);
        item.total = q * p;
      }

      items[idx] = item;
      return { ...prev, items };
    });
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  };

  const removeItemRow = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const resetForm = () => {
    setForm({
      fromBranch: BRANCHES[0],
      toBranch: "",
      externalPharmacy: "",
      contactPerson: "",
      externalPhone: "",
      settlementType: "StockReturn",
      notes: "",
      items: [{ ...EMPTY_ITEM }],
    });
    setTransferType("ExternalIn");
  };

  // ── Create Record ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (transferType === "Internal") {
      if (!form.toBranch) {
        toastApiError(new Error("Please select destination branch"));
        return;
      }
      if (form.fromBranch === form.toBranch) {
        toastApiError(new Error("Source and destination branch cannot be the same"));
        return;
      }
    } else {
      if (!form.externalPharmacy.trim()) {
        toastApiError(new Error("Please enter partner pharmacy or medical store name"));
        return;
      }
    }

    if (form.items.some((i) => !i.medicineName.trim() || i.quantity <= 0)) {
      toastApiError(new Error("Please enter valid medicine name and quantity for all items"));
      return;
    }

    // Stock check for outgoing transfers
    if (transferType === "ExternalOut" || transferType === "Internal") {
      for (const item of form.items) {
        const med = medicines.find((m) => m.id === item.medicineId);
        if (med && item.quantity > med.stock) {
          toastApiError(
            new Error(`Insufficient stock for ${med.name}. Available: ${med.stock}`)
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const fromBranch =
        transferType === "ExternalIn" ? form.externalPharmacy : form.fromBranch;
      const toBranch =
        transferType === "ExternalOut"
          ? form.externalPharmacy
          : transferType === "ExternalIn"
          ? form.fromBranch
          : form.toBranch;

      const created = await stockTransferService.create({
        transferType,
        fromBranch,
        toBranch,
        externalPharmacy: form.externalPharmacy,
        externalPhone: form.externalPhone,
        contactPerson: form.contactPerson,
        settlementType: form.settlementType,
        notes: form.notes,
        initiatedBy: currentUser?.name || "Admin Staff",
        items: form.items,
      });

      setTransfers((prev) => [created, ...prev]);

      // Adjust local medicines state
      if (transferType === "ExternalIn") {
        setMedicines((prev) =>
          prev.map((m) => {
            const it = form.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: m.stock + it.quantity } : m;
          })
        );
      } else {
        setMedicines((prev) =>
          prev.map((m) => {
            const it = form.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: Math.max(0, m.stock - it.quantity) } : m;
          })
        );
      }

      toastSuccess(
        transferType === "ExternalIn"
          ? "Stock borrowed and inventory increased"
          : transferType === "ExternalOut"
          ? "Stock lent out and inventory deducted"
          : "Branch transfer dispatched successfully"
      );

      setShowForm(false);
      resetForm();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Settle Dialog ─────────────────────────────────────────────────────
  const openSettleDialog = (record: StockTransfer) => {
    setSettleRecord(record);
    setSettleMode("Returned");
    const totalVal = record.items.reduce(
      (sum, it) => sum + (it.total || it.quantity * (it.unitPrice || 0)),
      0
    );
    setSettleAmount(totalVal);
    setSettleNotes("");
    setShowSettleModal(true);
  };

  // ── Settle / Return Stock ──────────────────────────────────────────────────
  const handleSettle = async () => {
    if (!settleRecord) return;
    try {
      const updated = await stockTransferService.updateStatus(
        settleRecord.id,
        settleMode === "Returned" ? "Returned" : "PaidCash",
        {
          settledType: settleMode === "Returned" ? "StockReturn" : "Cash",
          settledAmount: settleMode === "PaidCash" ? settleAmount : undefined,
          notes: settleNotes || undefined,
        }
      );

      setTransfers((prev) => prev.map((t) => (t.id === settleRecord.id ? updated : t)));

      // If ExternalOut was returned back, restock medicines
      if (settleRecord.transferType === "ExternalOut" && settleMode === "Returned") {
        setMedicines((prev) =>
          prev.map((m) => {
            const it = settleRecord.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: m.stock + it.quantity } : m;
          })
        );
      }

      // If ExternalIn was returned back to neighbor, deduct replacement medicine
      if (settleRecord.transferType === "ExternalIn" && settleMode === "Returned") {
        setMedicines((prev) =>
          prev.map((m) => {
            const it = settleRecord.items.find((i) => i.medicineId === m.id);
            return it ? { ...m, stock: Math.max(0, m.stock - it.quantity) } : m;
          })
        );
      }

      toastSuccess(
        settleMode === "Returned"
          ? "Transfer marked as Returned & inventory balanced"
          : "Transfer marked as Settled by Cash"
      );

      setShowSettleModal(false);
      setSettleRecord(null);
    } catch (err) {
      toastApiError(err);
    }
  };

  // ── Internal Branch Receive ────────────────────────────────────────────────
  const handleReceiveInternal = async (t: StockTransfer) => {
    try {
      const updated = await stockTransferService.receive(t.id);
      setTransfers((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
      setMedicines((prev) =>
        prev.map((m) => {
          const item = t.items.find((i) => i.medicineId === m.id);
          return item ? { ...m, stock: m.stock + item.quantity } : m;
        })
      );
      toastSuccess("Branch transfer received and inventory updated");
    } catch (err) {
      toastApiError(err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header title="Stock Transfers" />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Inward Borrowed */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Inward Borrowed</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {stats.borrowedCount}{" "}
                <span className="text-xs font-medium text-slate-400">pending</span>
              </h3>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                Worth: {formatCurrency(stats.borrowedValue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowDownToLine size={20} />
            </div>
          </div>

          {/* Card 2: Outward Lent */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Outward Lent</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {stats.lentCount}{" "}
                <span className="text-xs font-medium text-slate-400">pending</span>
              </h3>
              <p className="text-xs font-semibold text-amber-600 mt-1">
                Worth: {formatCurrency(stats.lentValue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ArrowUpFromLine size={20} />
            </div>
          </div>

          {/* Card 3: Branch Transfers */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Branch Transfers</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {stats.branchCount}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Inter-branch logistics</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
          </div>

          {/* Card 4: Settled / Cleared */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Settled & Cleared</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {stats.settledCount}
              </h3>
              <p className="text-xs text-emerald-600 mt-1">Returned or paid</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Action Bar & Filter Navigation */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          {/* Left: Search & Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search store, runner, medicine, #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)] transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(
                [
                  { key: "All", label: "All Records" },
                  { key: "ExternalIn", label: "Inward (Borrowed)" },
                  { key: "ExternalOut", label: "Outward (Lent)" },
                  { key: "Internal", label: "Branch Transfer" },
                ] as const
              ).map((tab) => {
                const isSelected = typeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTypeFilter(tab.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-[var(--theme-500,#2563eb)] text-white border-[var(--theme-500,#2563eb)] shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Only Pending Toggle */}
            <button
              onClick={() => setOnlyPending((prev) => !prev)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyPending
                  ? "bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  onlyPending ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                }`}
              />
              <span>Pending Only</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={fetchAll}
              title="Refresh Records"
              className="p-2 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[var(--theme-500,#2563eb)] hover:bg-[var(--theme-600,#1d4ed8)] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New Stock Transfer</span>
            </button>
          </div>
        </div>

        {/* Transfers Main Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Transfer # & Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Partner Store / Branch</th>
                  <th className="py-3 px-3">Items & Quantities</th>
                  <th className="py-3 px-3">Value</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[var(--theme-500,#2563eb)]" />
                      <span>Loading records from database...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Handshake size={32} className="mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
                      <p className="font-bold text-slate-700 text-sm">No transfer records found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Use "New Stock Transfer" to log stock movements or external partner exchanges.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedTransfers.map((t) => {
                    const cfg = TYPE_CONFIG[t.transferType];
                    const Icon = cfg.icon;
                    const isPending = t.status === "Pending";
                    const totalVal = t.items.reduce(
                      (sum, it) => sum + (it.total || it.quantity * (it.unitPrice || 0)),
                      0
                    );

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Transfer # & Date */}
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-slate-800">{t.transferNumber}</span>
                          <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                            {formatDate(t.transferDate)}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.color}`}
                          >
                            <Icon size={12} />
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Counterparty / Branch */}
                        <td className="py-3 px-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">
                              {t.transferType === "Internal"
                                ? `${t.fromBranch} → ${t.toBranch}`
                                : t.externalPharmacy || t.toBranch || "External Partner"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {t.contactPerson && (
                                <span className="flex items-center gap-0.5 text-slate-600">
                                  <User size={11} className="text-slate-400" />
                                  <span>{t.contactPerson}</span>
                                </span>
                              )}
                              {t.externalPhone && (
                                <span className="flex items-center gap-0.5 text-slate-500">
                                  <Phone size={10} className="text-slate-400" />
                                  <span>{t.externalPhone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 max-w-[220px]">
                            {t.items.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700 truncate mr-2">
                                  {it.medicineName}
                                </span>
                                <span className="text-slate-500 font-bold shrink-0">
                                  x {it.quantity}
                                </span>
                              </div>
                            ))}
                            {t.items.length > 2 && (
                              <span className="text-[10px] text-blue-600 font-bold">
                                +{t.items.length - 2} more items
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Value */}
                        <td className="py-3 px-3">
                          <span className="font-black text-slate-900 text-xs">
                            {formatCurrency(totalVal)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={STATUS_VARIANT[t.status]}>
                              {t.status === "PaidCash" ? "Paid Cash" : t.status}
                            </Badge>
                            {t.settledDate && (
                              <span className="text-[10px] text-slate-400">
                                Settled: {formatDate(t.settledDate)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Settlement buttons for pending udhaar */}
                            {isPending && t.transferType !== "Internal" && (
                              <button
                                onClick={() => openSettleDialog(t)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} />
                                <span>Settle</span>
                              </button>
                            )}

                            {/* Internal Branch Dispatch & Receive */}
                            {t.transferType === "Internal" && t.status === "InTransit" && (
                              <button
                                onClick={() => handleReceiveInternal(t)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <PackageCheck size={12} />
                                <span>Receive</span>
                              </button>
                            )}

                            {/* Slip Print Button */}
                            <button
                              onClick={() => {
                                setSelectedTransfer(t);
                                setShowSlipModal(true);
                              }}
                              title="Print Transfer Voucher / Gate Pass"
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && filtered.length <= 10 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>{filtered.length}</strong> of {transfers.length} records
              </span>
              <span className="text-[11px] text-slate-400">
                Connected to Live PostgreSQL Database
              </span>
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="records"
          />
        </div>
      </div>

      {/* ── New Transfer Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title="New Stock Transfer"
        size="xl"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-[var(--theme-500,#2563eb)] hover:bg-[var(--theme-600,#1d4ed8)] rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Handshake size={15} />
              )}
              <span>Save & Update Inventory</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Transfer Type Segment Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
              Transfer Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                Object.entries(TYPE_CONFIG) as [
                  TransferType,
                  (typeof TYPE_CONFIG)[TransferType]
                ][]
              ).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = transferType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTransferType(key)}
                    className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? "border-[var(--theme-500,#2563eb)] bg-[var(--theme-50,#eff6ff)] shadow-xs ring-1 ring-[var(--theme-400,#60a5fa)]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? "bg-[var(--theme-500,#2563eb)] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{cfg.label}</span>
                    <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {cfg.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* External Medical Store Details */}
          {transferType !== "Internal" ? (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Store Name with Datalist Suggestions */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {transferType === "ExternalIn"
                      ? "Source Pharmacy / Partner Store *"
                      : "Receiving Pharmacy / Partner Store *"}
                  </label>
                  <input
                    type="text"
                    list="suggested-stores"
                    value={form.externalPharmacy}
                    onChange={(e) => setForm({ ...form, externalPharmacy: e.target.value })}
                    placeholder="e.g. Al-Madina Medicos"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                  />
                  <datalist id="suggested-stores">
                    {SUGGESTED_STORES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Runner / Contact Person */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Person / Runner Name
                  </label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="e.g. Kashif (Delivery Runner)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.externalPhone}
                    onChange={(e) => setForm({ ...form, externalPhone: e.target.value })}
                    placeholder="03XX-XXXXXXX"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                  />
                </div>

                {/* Settlement Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Settlement Method
                  </label>
                  <select
                    value={form.settlementType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settlementType: e.target.value as "StockReturn" | "Cash",
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                  >
                    <option value="StockReturn">Return Medicine (Stock Exchange)</option>
                    <option value="Cash">Cash Settlement</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* Internal Branches */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Source Branch *
                </label>
                <select
                  value={form.fromBranch}
                  onChange={(e) => setForm({ ...form, fromBranch: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                >
                  {BRANCHES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Branch *
                </label>
                <select
                  value={form.toBranch}
                  onChange={(e) => setForm({ ...form, toBranch: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
                >
                  <option value="">— Select destination —</option>
                  {BRANCHES.filter((b) => b !== form.fromBranch).map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Medicines Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Medicines & Quantities
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 text-xs font-bold text-[var(--theme-600,#1d4ed8)] bg-[var(--theme-50,#eff6ff)] hover:bg-[var(--theme-100,#dbeafe)] border border-[var(--theme-200,#bfdbfe)] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medicine</th>
                    <th className="py-2.5 px-2 w-28">Available Stock</th>
                    <th className="py-2.5 px-2 w-24">Quantity</th>
                    <th className="py-2.5 px-2 w-28">Unit Price</th>
                    <th className="py-2.5 px-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((item, idx) => {
                    const med = medicines.find((m) => m.id === item.medicineId);

                    return (
                      <tr key={idx} className="bg-white">
                        <td className="py-2 px-3">
                          <select
                            value={item.medicineId}
                            onChange={(e) => updateItem(idx, "medicineId", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-500,#2563eb)]"
                          >
                            <option value="">Select from catalogue</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.stock} in stock) — Rs {m.sellingPrice}
                              </option>
                            ))}
                          </select>
                          {!item.medicineId && (
                            <input
                              type="text"
                              value={item.medicineName}
                              onChange={(e) => updateItem(idx, "medicineName", e.target.value)}
                              placeholder="Or enter custom medicine name..."
                              className="mt-1 w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--theme-500,#2563eb)]"
                            />
                          )}
                        </td>

                        <td className="py-2 px-2 text-slate-500 font-medium">
                          {med ? (
                            <span
                              className={`font-bold ${
                                med.stock === 0 ? "text-red-500" : "text-slate-700"
                              }`}
                            >
                              {med.stock} {med.unit || "unit"}s
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-500,#2563eb)]"
                          />
                        </td>

                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice || 0}
                            onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-500,#2563eb)]"
                          />
                        </td>

                        <td className="py-2 px-2 text-center">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Reference
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Emergency patient prescription, will return replacement upon distributor delivery"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-400,#60a5fa)] focus:border-[var(--theme-500,#2563eb)]"
            />
          </div>
        </div>
      </Modal>

      {/* ── Settlement / Return Dialog ───────────────────────────────────────── */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => {
          setShowSettleModal(false);
          setSettleRecord(null);
        }}
        title="Settle Stock Transfer"
        size="md"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setShowSettleModal(false);
                setSettleRecord(null);
              }}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSettle}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-[var(--theme-500,#2563eb)] hover:bg-[var(--theme-600,#1d4ed8)] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Confirm Settlement
            </button>
          </div>
        }
      >
        {settleRecord && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Record #:</span>
                <span className="font-mono font-bold text-slate-800">
                  {settleRecord.transferNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Partner Store:</span>
                <span className="font-bold text-slate-800">
                  {settleRecord.externalPharmacy || settleRecord.toBranch}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-bold text-blue-700">
                  {TYPE_CONFIG[settleRecord.transferType].label}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Items in Record:</span>
                <div className="mt-1 space-y-1">
                  {settleRecord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{it.medicineName}</span>
                      <span className="font-bold">x {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Settle Mode Choice */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Settlement Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMode("Returned")}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    settleMode === "Returned"
                      ? "border-[var(--theme-500,#2563eb)] bg-[var(--theme-50,#eff6ff)] text-[var(--theme-700,#1d4ed8)] font-bold ring-1 ring-[var(--theme-400,#60a5fa)]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs">Physical Return</p>
                  <span className="text-[11px] opacity-75">
                    {settleRecord.transferType === "ExternalOut"
                      ? "Medicine returned to our stock"
                      : "Medicine returned to partner"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettleMode("PaidCash")}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    settleMode === "PaidCash"
                      ? "border-[var(--theme-500,#2563eb)] bg-[var(--theme-50,#eff6ff)] text-[var(--theme-700,#1d4ed8)] font-bold ring-1 ring-[var(--theme-400,#60a5fa)]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs">Cash Settlement</p>
                  <span className="text-[11px] opacity-75">
                    Balanced via cash payment
                  </span>
                </button>
              </div>
            </div>

            {/* If Paid Cash, amount */}
            {settleMode === "PaidCash" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Settled Cash Amount (Rs)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-500,#2563eb)]"
                />
              </div>
            )}

            {/* Settle Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Settlement Notes (optional)
              </label>
              <input
                type="text"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="e.g. Received replacement batch from distributor"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-500,#2563eb)]"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Printable Slip / Gate Pass Modal ─────────────────────────────────── */}
      <Modal
        isOpen={showSlipModal}
        onClose={() => {
          setShowSlipModal(false);
          setSelectedTransfer(null);
        }}
        title="Stock Transfer Voucher / Gate Pass"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-[var(--theme-500,#2563eb)] hover:bg-[var(--theme-600,#1d4ed8)] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print Voucher</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSlipModal(false);
                setSelectedTransfer(null);
              }}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        }
      >
        {selectedTransfer && (
          <div className="space-y-4">
            {/* Printable Slip Container */}
            <div
              id="printable-slip"
              className="bg-white p-5 border-2 border-dashed border-slate-300 rounded-2xl text-slate-800 text-xs font-sans space-y-4"
            >
              {/* Slip Header */}
              <div className="text-center border-b pb-3 border-slate-200">
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  {settings.pharmacyName || "PharmaPOS Pharmacy"}
                </h2>
                <p className="text-[11px] text-slate-500">{settings.address || "Main Branch"}</p>
                <p className="text-[11px] text-slate-500">Phone: {settings.phone || "03XX-XXXXXXX"}</p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-[var(--theme-500,#2563eb)] text-white rounded font-bold uppercase tracking-wider text-[10px]">
                  {selectedTransfer.transferType === "ExternalIn"
                    ? "INWARD BORROW CHALLAN"
                    : selectedTransfer.transferType === "ExternalOut"
                    ? "OUTWARD LEND CHALLAN"
                    : "INTER-BRANCH DISPATCH VOUCHER"}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Voucher #:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedTransfer.transferNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date:</span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(selectedTransfer.transferDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Partner Store / Branch:</span>
                  <span className="font-bold text-slate-900">
                    {selectedTransfer.externalPharmacy || selectedTransfer.toBranch}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact / Runner:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedTransfer.contactPerson || "Staff Runner"}{" "}
                    {selectedTransfer.externalPhone && `(${selectedTransfer.externalPhone})`}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2">Item Description</th>
                    <th className="py-1.5 px-2 text-center w-16">Qty</th>
                    <th className="py-1.5 px-2 text-right w-20">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTransfer.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 font-medium">{it.medicineName}</td>
                      <td className="py-1.5 px-2 text-center font-bold">{it.quantity}</td>
                      <td className="py-1.5 px-2 text-right">
                        {formatCurrency(it.total || it.quantity * (it.unitPrice || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes */}
              {selectedTransfer.notes && (
                <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="font-bold text-slate-600">Note: </span>
                  <span className="text-slate-700">{selectedTransfer.notes}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-6 text-center text-[10px] text-slate-500 border-t border-slate-200">
                <div>
                  <div className="border-b border-slate-300 pb-4 mb-1"></div>
                  <span>Runner / Receiver Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-4 mb-1"></div>
                  <span>Authorized Incharge Signature</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
