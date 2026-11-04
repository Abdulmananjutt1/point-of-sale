"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RotateCcw, Eye, AlertCircle, Loader2, RefreshCw, Package,
  ArrowLeftRight, Undo2, CheckCircle2, AlertTriangle, CreditCard,
  PackageCheck, PackageX, FileText, Check, X, Clock, Coins,
  Receipt, Building2, User, Sparkles, Filter,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { Sale, SaleReturn, ReturnItem, ReturnReason, ReturnCondition, PaymentMethod } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { returnService } from "@/services/returnService";
import { saleService } from "@/services/saleService";

const RETURN_REASONS: ReturnReason[] = ["Defective", "Expired", "Wrong Item", "Customer Request", "Other"];
const CONDITIONS: ReturnCondition[]  = ["Good", "Opened", "Damaged", "Expired"];

const REASON_MAP: Record<string, string> = {
  "Defective":        "Defective",
  "Expired":          "Expired",
  "Wrong Item":       "WrongItem",
  "Customer Request": "CustomerRequest",
  "Other":            "Other",
};

const REASON_DISPLAY: Record<string, ReturnReason> = {
  WrongItem:       "Wrong Item",
  CustomerRequest: "Customer Request",
};

const CONDITION_BADGE: Record<ReturnCondition, { label: string; badge: "success" | "warning" | "danger" | "default" }> = {
  Good:    { label: "Restockable", badge: "success" },
  Opened:  { label: "Opened Box",  badge: "warning" },
  Damaged: { label: "Damaged",     badge: "danger"  },
  Expired: { label: "Expired",     badge: "danger"  },
};

export default function ReturnsPage() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [sales, setSales]     = useState<Sale[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [stats, setStats]     = useState({ total: 0, today: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch]                   = useState("");
  const [returnSearch, setReturnSearch]       = useState("");
  const [salesPage, setSalesPage]             = useState(1);
  const [returnsPage, setReturnsPage]         = useState(1);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSale, setSelectedSale]       = useState<Sale | null>(null);
  const [viewReturn, setViewReturn]           = useState<SaleReturn | null>(null);
  const [submitting, setSubmitting]           = useState(false);

  // Return form
  const [returnItems, setReturnItems]   = useState<ReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("Cash");
  const [notes, setNotes]               = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, returnsRes, statsRes] = await Promise.all([
        saleService.getAll({ status: "Completed", limit: 200 }),
        returnService.getAll({ limit: 200 }),
        returnService.getStats(),
      ]);
      setSales(salesRes.sales);
      setReturns(returnsRes.returns);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerName ?? "").toLowerCase().includes(q)
    );
  });

  const filteredReturns = returns.filter((r) => {
    const q = returnSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.returnNumber.toLowerCase().includes(q) ||
      r.invoiceNumber.toLowerCase().includes(q)
    );
  });

  const PAGE_SIZE = 10;

  useEffect(() => {
    setSalesPage(1);
  }, [search]);

  useEffect(() => {
    setReturnsPage(1);
  }, [returnSearch]);

  const paginatedSales = filteredSales.slice((salesPage - 1) * PAGE_SIZE, salesPage * PAGE_SIZE);
  const paginatedReturns = filteredReturns.slice((returnsPage - 1) * PAGE_SIZE, returnsPage * PAGE_SIZE);

  // ── Open return modal ──────────────────────────────────────────────────────
  const openReturn = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems(
      sale.items.map((item) => ({
        medicineId:     item.medicineId,
        medicineName:   item.medicineName,
        saleQuantity:   item.quantity,
        returnQuantity: 0,
        unitPrice:      item.unitPrice,
        reason:         "Customer Request" as ReturnReason,
        condition:      "Good" as ReturnCondition,
      }))
    );
    setNotes("");
    setRefundMethod((sale.paymentMethod as PaymentMethod) || "Cash");
    setShowReturnModal(true);
  };

  const updateReturnItem = <K extends keyof ReturnItem>(idx: number, field: K, value: ReturnItem[K]) => {
    setReturnItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const refundTotal = returnItems.reduce((s, i) => s + i.returnQuantity * i.unitPrice, 0);
  const totalReturningUnits = returnItems.reduce((s, i) => s + i.returnQuantity, 0);

  // ── Submit return ──────────────────────────────────────────────────────────
  const handleSubmitReturn = async () => {
    if (!selectedSale) return;
    const itemsToReturn = returnItems.filter((i) => i.returnQuantity > 0);
    if (!itemsToReturn.length) {
      toastApiError("Please set a return quantity greater than 0 for at least one item.");
      return;
    }
    if (itemsToReturn.some((i) => i.returnQuantity > i.saleQuantity)) {
      toastApiError("Return quantity cannot exceed the original quantity sold.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await returnService.create({
        saleId: selectedSale.id,
        items: itemsToReturn.map((i) => ({
          ...i,
          reason: (REASON_MAP[i.reason] ?? i.reason) as ReturnItem["reason"],
        })),
        refundMethod,
        notes: notes || undefined,
      });

      setReturns((prev) => [created, ...prev]);
      setSales((prev) => prev.filter((s) => s.id !== selectedSale.id));
      setStats((prev) => ({
        total:       prev.total + 1,
        today:       prev.today + 1,
        totalAmount: prev.totalAmount + refundTotal,
      }));

      toastSuccess(`Return processed successfully — Refund: ${formatCurrency(refundTotal)}`);
      setShowReturnModal(false);
      setSelectedSale(null);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 pb-12">
        <Header title="Returns & Refunds" />
        <div className="p-8 max-w-lg mx-auto text-center space-y-4 mt-12 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">Failed to load returns</h3>
          <p className="text-xs text-gray-500">{error}</p>
          <Button onClick={fetchAll} variant="outline" className="mx-auto">
            <RefreshCw size={14} /> Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <Header title="Returns & Refunds" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header / Sub-banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Returns & Refund Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Process customer item returns, issue refunds, record batch conditions, and maintain inventory restocking.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchAll}
              disabled={loading}
              className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── Executive Metric KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Returns */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Returns</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-mono tracking-tight">{stats.total}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                All recorded return receipts
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <RotateCcw size={22} />
            </div>
          </div>

          {/* Card 2: Today's Returns */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today's Returns</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">{stats.today}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Processed during active shift
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock size={22} />
            </div>
          </div>

          {/* Card 3: Total Refunded Amount */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Refunded Volume</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
                {formatCurrency(stats.totalAmount)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="text-gray-400">Paid back via Cash & Wallets</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Coins size={22} />
            </div>
          </div>
        </div>

        {/* ── Two-Column Main Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ══════════════════════════════════════════════════════════
              LEFT: COMPLETED INVOICES ELIGIBLE FOR RETURN (6 cols)
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Receipt size={18} className="text-blue-600" />
                    Eligible Sales for Return
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select a completed customer sale to issue items or cash back
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-mono">
                  {filteredSales.length} Invoices
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice number (e.g. INV-…) or customer name…"
                  className="w-full pl-10 pr-9 py-2.5 text-xs bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable Invoices List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-gray-50/60 border border-gray-200 rounded-xl p-4 animate-pulse space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-28" />
                        <div className="h-4 bg-gray-200 rounded w-16" />
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-40" />
                    </div>
                  ))
                ) : filteredSales.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <Package size={32} className="mx-auto text-gray-300" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-gray-700">No completed sales found</p>
                    <p className="text-xs text-gray-400">
                      {search ? "No invoice matches your search." : "Completed transactions will appear here."}
                    </p>
                  </div>
                ) : (
                  paginatedSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="bg-white border border-gray-200 hover:border-blue-300 hover:shadow-xs rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {sale.invoiceNumber}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {sale.customerName || "Walk-in Customer"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>{formatDate(sale.createdAt)}</span>
                          <span>•</span>
                          <span className="font-medium">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</span>
                          <span>•</span>
                          <Badge variant="default">{sale.paymentMethod}</Badge>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                        <span className="font-mono text-sm font-extrabold text-gray-900">
                          {formatCurrency(sale.total)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => openReturn(sale)}
                          className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                        >
                          <RotateCcw size={12} />
                          <span>Return Items</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Pagination
                currentPage={salesPage}
                totalItems={filteredSales.length}
                pageSize={PAGE_SIZE}
                onPageChange={setSalesPage}
                itemLabel="sales"
                className="rounded-xl border border-gray-100"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT: PROCESSED RETURN RECEIPTS ARCHIVE (6 cols)
             ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Undo2 size={18} className="text-emerald-600" />
                    Processed Returns Archive
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    History of issued refunds and restocked items
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-mono">
                  {returns.length} Records
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  placeholder="Filter by return # or invoice #…"
                  className="w-full pl-10 pr-9 py-2.5 text-xs bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
                />
                {returnSearch && (
                  <button
                    type="button"
                    onClick={() => setReturnSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Scrollable Returns List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-gray-50/60 border border-gray-200 rounded-xl p-4 animate-pulse space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-28" />
                        <div className="h-4 bg-gray-200 rounded w-16" />
                      </div>
                      <div className="h-3 bg-gray-100 rounded w-36" />
                    </div>
                  ))
                ) : filteredReturns.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <RotateCcw size={32} className="mx-auto text-gray-300" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-gray-700">No returns processed yet</p>
                    <p className="text-xs text-gray-400">Processed returns will be logged here with refund vouchers.</p>
                  </div>
                ) : (
                  paginatedReturns.map((ret) => (
                    <div
                      key={ret.id}
                      className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {ret.returnNumber}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            Ref: {ret.invoiceNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>{formatDate(ret.returnDate)}</span>
                          <span>•</span>
                          <span>{ret.items.length} item{ret.items.length !== 1 ? "s" : ""}</span>
                          <span>•</span>
                          <Badge variant="success">{ret.refundMethod}</Badge>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                        <span className="font-mono text-sm font-extrabold text-emerald-700">
                          -{formatCurrency(ret.refundAmount)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewReturn(ret)}
                          className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 border-gray-200"
                        >
                          <Eye size={13} />
                          <span>View Voucher</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Pagination
                currentPage={returnsPage}
                totalItems={filteredReturns.length}
                pageSize={PAGE_SIZE}
                onPageChange={setReturnsPage}
                itemLabel="returns"
                className="rounded-xl border border-gray-100"
              />
            </div>
          </div>

        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: PROCESS RETURN WORKSPACE
         ══════════════════════════════════════════════════════════ */}
      {selectedSale && (
        <Modal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          title={`Process Return — ${selectedSale.invoiceNumber}`}
          size="xl"
        >
          <div className="space-y-5">
            {/* Context Box */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <PackageCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <span className="font-bold">Inventory Restocking Notice:</span> Any returned items marked as{" "}
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">Good</span>{" "}
                condition will be automatically restocked into active medicine inventory. Damaged or Expired items will be recorded as write-offs.
              </div>
            </div>

            {/* Items Selection Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-gray-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3.5 py-3">Medicine Name</th>
                      <th className="px-3.5 py-3 text-center">Sold Qty</th>
                      <th className="px-3.5 py-3">Return Qty</th>
                      <th className="px-3.5 py-3">Reason</th>
                      <th className="px-3.5 py-3">Item Condition</th>
                      <th className="px-3.5 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {returnItems.map((item, idx) => {
                      const isReturning = item.returnQuantity > 0;
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isReturning ? "bg-amber-50/40" : "hover:bg-gray-50/50"
                          }`}
                        >
                          <td className="px-3.5 py-3">
                            <p className="font-semibold text-gray-900">{item.medicineName}</p>
                            <span className="font-mono text-[10px] text-gray-400">@{formatCurrency(item.unitPrice)} each</span>
                          </td>
                          <td className="px-3.5 py-3 text-center font-bold text-gray-700">
                            {item.saleQuantity}
                          </td>
                          <td className="px-3.5 py-3">
                            <input
                              type="number"
                              min={0}
                              max={item.saleQuantity}
                              value={item.returnQuantity}
                              onChange={(e) => updateReturnItem(idx, "returnQuantity", Math.min(item.saleQuantity, Math.max(0, Number(e.target.value))))}
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 font-bold text-center text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3.5 py-3">
                            <select
                              value={item.reason}
                              onChange={(e) => updateReturnItem(idx, "reason", e.target.value as ReturnReason)}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none"
                            >
                              {RETURN_REASONS.map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3.5 py-3">
                            <select
                              value={item.condition}
                              onChange={(e) => updateReturnItem(idx, "condition", e.target.value as ReturnCondition)}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none font-medium"
                            >
                              {CONDITIONS.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono font-bold text-gray-900">
                            {formatCurrency(item.returnQuantity * item.unitPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Options & Calculation Banner */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Refund Payout Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {["Cash", "Card", "JazzCash", "EasyPaisa", "UBL"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-xs text-gray-400 font-medium">Total Refund Payable ({totalReturningUnits} items):</span>
                <p className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {formatCurrency(refundTotal)}
                </p>
              </div>
            </div>

            {/* Return Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Return Notes / Reason Description (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Customer brought sealed bottle, packaging undamaged…"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReturnModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmitReturn}
                disabled={submitting || refundTotal === 0}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Confirm & Issue Refund ({formatCurrency(refundTotal)})</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: VIEW RETURN DETAILS VOUCHER
         ══════════════════════════════════════════════════════════ */}
      {viewReturn && (
        <Modal
          isOpen={!!viewReturn}
          onClose={() => setViewReturn(null)}
          title={`Return Voucher #${viewReturn.returnNumber}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Header Voucher Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 font-mono">
              <div>
                <span className="text-gray-400 block text-[11px]">Original Invoice:</span>
                <span className="font-bold text-blue-600">{viewReturn.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Return Date:</span>
                <span className="font-bold text-gray-800">{formatDate(viewReturn.returnDate)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Payout Method:</span>
                <span className="font-bold text-gray-800">{viewReturn.refundMethod}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Refund Paid:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(viewReturn.refundAmount)}</span>
              </div>
            </div>

            {viewReturn.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900">
                <span className="font-bold block mb-0.5">Notes:</span>
                <p className="italic">{viewReturn.notes}</p>
              </div>
            )}

            {/* Returned Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Medicine</th>
                    <th className="px-3.5 py-2.5 text-center">Original</th>
                    <th className="px-3.5 py-2.5 text-center">Returned</th>
                    <th className="px-3.5 py-2.5">Reason</th>
                    <th className="px-3.5 py-2.5">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewReturn.items.map((item, i) => {
                    const cond = CONDITION_BADGE[item.condition] ?? { label: item.condition, badge: "default" as const };
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3.5 py-3 font-semibold text-gray-900">{item.medicineName}</td>
                        <td className="px-3.5 py-3 text-center text-gray-500">{item.saleQuantity}</td>
                        <td className="px-3.5 py-3 text-center font-bold text-rose-600 font-mono">{item.returnQuantity}</td>
                        <td className="px-3.5 py-3 text-gray-700">{REASON_DISPLAY[item.reason] ?? item.reason}</td>
                        <td className="px-3.5 py-3">
                          <Badge variant={cond.badge}>{cond.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button onClick={() => setViewReturn(null)} variant="outline">
                Close Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
