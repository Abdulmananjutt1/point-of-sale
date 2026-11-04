"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Plus, CheckCircle, Search, AlertTriangle,
  RefreshCw, Loader2, Eye, Trash2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Check, X, Layers, Boxes,
  FileCheck2, User, Calendar, ArrowRight, Sparkles, Filter,
  History, AlertCircle, CheckCircle2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { stockCountService, StockCountData, StockCountItemData } from "@/services/stockCountService";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; badge: "success" | "warning" | "info" | "default"; bg: string; text: string; border: string }> = {
  Verified:   { label: "Verified & Applied", badge: "success", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  InProgress: { label: "In Progress",        badge: "warning", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  Completed:  { label: "Awaiting Review",    badge: "info",    bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
  Draft:      { label: "Draft Count",        badge: "default", bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200"   },
};

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 animate-pulse">
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-28 mb-1" /><div className="h-2.5 bg-gray-100 rounded w-16" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-24" /></td>
          <td className="px-5 py-4"><div className="h-6 bg-gray-200 rounded-full w-24" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-16" /></td>
          <td className="px-5 py-4"><div className="h-3.5 bg-gray-200 rounded w-24 mb-1" /><div className="h-2.5 bg-gray-100 rounded w-32" /></td>
          <td className="px-5 py-4 text-right"><div className="h-7 bg-gray-100 rounded w-16 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

// ── Count Detail Workspace Modal ──────────────────────────────────────────────
interface CountDetailProps {
  count:      StockCountData | null;
  onClose:    () => void;
  onFinalize: (id: string) => void;
  onUpdate:   (countId: string, medicineId: string, physicalCount: number, notes?: string) => Promise<void>;
  finalizing: boolean;
}

function CountDetailModal({ count, onClose, onFinalize, onUpdate, finalizing }: CountDetailProps) {
  const [itemSearch, setItemSearch] = useState("");
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [saving, setSaving]         = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "discrepancies" | "pending" | "matched">("all");

  useEffect(() => {
    if (count) {
      const vals: Record<string, number> = {};
      count.items.forEach((i) => {
        if (i.physicalCount !== null) vals[i.medicineId] = i.physicalCount;
      });
      setEditValues(vals);
    }
  }, [count]);

  if (!count) return null;

  const isVerified = count.status === "Verified";

  const totalItems   = count.items.length;
  const countedItems = count.items.filter((i) => i.physicalCount !== null).length;
  const progressPct  = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;
  const discrepancies = count.items.filter((i) => i.variance !== 0 && i.physicalCount !== null).length;

  const filteredItems = count.items.filter((i) => {
    const q = itemSearch.toLowerCase().trim();
    const matchSearch = !q || i.medicineName.toLowerCase().includes(q) || i.batchNumber?.toLowerCase().includes(q);
    if (!matchSearch) return false;

    const physVal = editValues[i.medicineId] ?? i.physicalCount;
    const isCounted = physVal !== undefined && physVal !== null;
    const variance = isCounted ? (Number(physVal) - i.systemStock) : i.variance;

    if (filterMode === "discrepancies") return isCounted && variance !== 0;
    if (filterMode === "pending") return !isCounted;
    if (filterMode === "matched") return isCounted && variance === 0;
    return true;
  });

  const handleSaveItem = async (medicineId: string) => {
    const physCount = editValues[medicineId];
    if (physCount === undefined || physCount < 0) return;
    setSaving(medicineId);
    try {
      await onUpdate(count.id, medicineId, physCount);
      toastSuccess("Physical count saved");
    } finally {
      setSaving(null);
    }
  };

  const handleMatchSystem = (medicineId: string, systemStock: number) => {
    setEditValues((prev) => ({ ...prev, [medicineId]: systemStock }));
  };

  return (
    <Modal isOpen={!!count} onClose={onClose} title={`Stocktake Audit — #${count.countNumber}`} size="xl">
      <div className="space-y-5">
        {/* Top Progress & Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Metric 1: Count Progress */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
              <span>Auditing Progress</span>
              <span className="font-mono">{countedItems} / {totalItems} ({progressPct}%)</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Metric 2: Discrepancy Count */}
          <div className={`border rounded-xl p-3.5 flex items-center justify-between ${
            discrepancies > 0
              ? "bg-amber-50/60 border-amber-200 text-amber-900"
              : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
          }`}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Discrepancies</p>
              <p className="text-xl font-bold font-mono">
                {discrepancies} {discrepancies === 1 ? "item" : "items"}
              </p>
            </div>
            {discrepancies > 0 ? (
              <AlertTriangle size={20} className="text-amber-600" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-600" />
            )}
          </div>

          {/* Metric 3: Audit Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Current Status</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{STATUS_CONFIG[count.status]?.label ?? count.status}</p>
            </div>
            <Badge variant={STATUS_CONFIG[count.status]?.badge ?? "default"}>
              {count.status}
            </Badge>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search medication name or batch number…"
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
            {itemSearch && (
              <button
                type="button"
                onClick={() => setItemSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {[
              { id: "all",           label: "All Items" },
              { id: "discrepancies", label: `Variances (${discrepancies})` },
              { id: "pending",       label: `Pending (${totalItems - countedItems})` },
              { id: "matched",       label: "Exact Match" },
            ].map((f) => {
              const active = filterMode === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all select-none cursor-pointer ${
                    active
                      ? "bg-[var(--theme-500,#2563eb)] text-white font-semibold shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Items Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs max-h-84 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-2.5">Medication Name</th>
                <th className="px-4 py-2.5 text-center">System Expected</th>
                <th className="px-4 py-2.5">Physical Count</th>
                <th className="px-4 py-2.5 text-center">Variance Result</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-xs">
                    No medications match the active search / filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const physVal  = editValues[item.medicineId] ?? item.physicalCount ?? "";
                  const isCounted = typeof physVal === "number";
                  const variance = isCounted ? (Number(physVal) - item.systemStock) : item.variance;
                  const isDirty  = isCounted && physVal !== item.physicalCount;

                  return (
                    <tr
                      key={item.medicineId}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isCounted && variance < 0
                          ? "bg-rose-50/30"
                          : isCounted && variance > 0
                          ? "bg-emerald-50/30"
                          : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs">{item.medicineName}</p>
                        <span className="font-mono text-[10px] text-gray-400">
                          Batch: {item.batchNumber || "BT-DEFAULT"}
                        </span>
                      </td>

                      {/* Expected Stock */}
                      <td className="px-4 py-3 text-center font-bold text-gray-700 font-mono text-sm">
                        {item.systemStock}
                      </td>

                      {/* Physical Count Input */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={physVal}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setEditValues((prev) => ({ ...prev, [item.medicineId]: val as any }));
                            }}
                            disabled={isVerified}
                            placeholder="0"
                            className="w-18 rounded-lg border border-gray-200 px-2 py-1 font-bold text-center text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          {!isVerified && (
                            <button
                              type="button"
                              onClick={() => handleMatchSystem(item.medicineId, item.systemStock)}
                              className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                              title="Match System Stock"
                            >
                              Match
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Variance Indicator */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isCounted ? (
                          variance === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Check size={11} className="text-gray-500" /> Exact Match
                            </span>
                          ) : variance > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                              <TrendingUp size={11} className="text-emerald-600" /> +{variance} Surplus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-mono">
                              <TrendingDown size={11} className="text-rose-600" /> {variance} Shortage
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300 text-[11px] font-mono italic">Uncounted</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {isDirty && !isVerified && (
                          <Button
                            size="sm"
                            onClick={() => handleSaveItem(item.medicineId)}
                            disabled={saving === item.medicineId}
                            className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700"
                          >
                            {saving === item.medicineId ? <Loader2 size={11} className="animate-spin" /> : "Save"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Bottom Actions */}
        {!isVerified ? (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Finalizing will update actual inventory stocks to match physical counts.
              </span>
              <span className="font-medium font-mono">{countedItems} of {totalItems} saved</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Keep Open & Close Dialog
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onFinalize(count.id)}
                disabled={finalizing || countedItems === 0}
              >
                {finalizing ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={16} />}
                <span>Finalize Audit & Apply Adjustments</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            This stock audit has been verified and stock adjustments have been permanently applied to inventory.
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────
export default function StockCountPage() {
  const [counts, setCounts]           = useState<StockCountData[]>([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [creating, setCreating]       = useState(false);
  const [finalizing, setFinalizing]   = useState(false);
  const [activeCount, setActiveCount] = useState<StockCountData | null>(null);
  const [detailCount, setDetailCount] = useState<StockCountData | null>(null);
  const [search, setSearch]           = useState("");

  const fetchCounts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const result = await stockCountService.getAll({ page: p, limit: 10 });
      setCounts(result.items ?? []);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(p);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts(1);
  }, [fetchCounts]);

  const handleStart = async () => {
    setCreating(true);
    try {
      const count = await stockCountService.create();
      toastSuccess(`Stock audit #${count.countNumber} started`);
      setActiveCount(count);
      setDetailCount(count);
      fetchCounts(1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleFinalize = async (id: string) => {
    setFinalizing(true);
    try {
      const updated = await stockCountService.finalize(id);
      toastSuccess("Stock audit finalized & inventory adjusted!");
      setDetailCount(updated);
      setActiveCount(null);
      fetchCounts(1);
    } catch (err) {
      toastApiError(err);
    } finally {
      setFinalizing(false);
    }
  };

  const handleUpdateItem = async (countId: string, medicineId: string, physicalCount: number, notes?: string) => {
    try {
      await stockCountService.updateItem(countId, medicineId, physicalCount, notes);
      if (detailCount?.id === countId) {
        const updated = await stockCountService.getOne(countId);
        setDetailCount(updated);
      }
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stock count audit? This cannot be undone.")) return;
    try {
      await stockCountService.delete(id);
      toastSuccess("Stock audit record deleted");
      fetchCounts(1);
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const data = await stockCountService.getOne(id);
      setDetailCount(data);
    } catch (err) {
      toastApiError(err);
    }
  };

  const filteredCounts = counts.filter((c) =>
    !search || c.countNumber.toLowerCase().includes(search.toLowerCase())
  );

  const verifiedCounts   = counts.filter((c) => c.status === "Verified").length;
  const inProgressCounts = counts.filter((c) => c.status === "InProgress").length;
  const activeInProgress = counts.find((c) => c.status === "InProgress");

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <Header title="Stock Count" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header / Sub-banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Stocktake Audits & Physical Counts</h1>
            <p className="text-sm text-gray-500 mt-1">
              Verify physical pharmacy stocks against system records, identify shortages/surpluses, and reconcile batch counts.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchCounts(page)}
              disabled={loading}
              className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={handleStart}
              disabled={creating || inProgressCounts > 0}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} />}
              <span>{creating ? "Initializing…" : "Start New Audit"}</span>
            </Button>
          </div>
        </div>

        {/* ── Executive Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Audits */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Stock Audits</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-mono tracking-tight">{total}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                Historical count sessions
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Boxes size={22} />
            </div>
          </div>

          {/* Card 2: Verified & Reconciled */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Verified & Applied</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">{verifiedCounts}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Reconciled with live stock
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <FileCheck2 size={22} />
            </div>
          </div>

          {/* Card 3: In Progress Status */}
          <div className={`rounded-2xl border p-5 shadow-xs flex items-center justify-between transition-colors ${
            inProgressCounts > 0
              ? "bg-amber-50/60 border-amber-200"
              : "bg-white border-gray-200/80"
          }`}>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ongoing Audits</span>
              <p className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                inProgressCounts > 0 ? "text-amber-600" : "text-gray-900"
              }`}>
                {inProgressCounts}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {inProgressCounts > 0 ? (
                  <span className="text-amber-700 font-medium">⚠️ Action required to finalize</span>
                ) : (
                  <span className="text-emerald-600 font-medium">✓ Ready for new stocktake</span>
                )}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              inProgressCounts > 0
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-gray-50 text-gray-400 border-gray-200"
            }`}>
              <ClipboardCheck size={22} />
            </div>
          </div>
        </div>

        {/* ── Active Audit Highlight Banner (if in progress) ── */}
        {activeInProgress && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-950">
                  Stock Audit #{activeInProgress.countNumber} is currently Active
                </p>
                <p className="text-xs text-amber-800/80">
                  Started on {formatDate(activeInProgress.countDate)}. Please enter physical counts and finalize to re-open new audits.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleViewDetail(activeInProgress.id)}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-2xs"
            >
              <ArrowRight size={14} />
              <span>Continue Counting</span>
            </Button>
          </div>
        )}

        {/* ── Audit Sessions Table & Search ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs space-y-4 p-5">
          {/* Table Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Stocktake Audit Log</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filteredCounts.length} sessions recorded in system
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by audit # (e.g. SC-…)…"
                className="w-full pl-10 pr-8 py-2 text-xs bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Audit #</th>
                    <th className="px-5 py-3.5">Audit Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Medications Counted</th>
                    <th className="px-5 py-3.5">Auditor / User</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <TableSkeleton />
                  ) : filteredCounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <ClipboardCheck size={32} className="mx-auto text-gray-300" strokeWidth={1.5} />
                          <h4 className="text-sm font-bold text-gray-800">No Stock Counts Found</h4>
                          <p className="text-xs text-gray-400">
                            {search
                              ? "No audit sessions matched your search query."
                              : "Start a new stocktake session to verify your physical inventory against system quantities."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCounts.map((count) => {
                      const itemCount = count._count?.items ?? count.items?.length ?? 0;
                      const statusCfg = STATUS_CONFIG[count.status] ?? {
                        label: count.status,
                        badge: "default" as const,
                      };

                      return (
                        <tr key={count.id} className="hover:bg-gray-50/70 transition-colors group">
                          {/* Audit Number */}
                          <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                            <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {count.countNumber}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400 shrink-0" />
                              <span>{formatDate(count.countDate)}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge variant={statusCfg.badge}>
                              {statusCfg.label}
                            </Badge>
                          </td>

                          {/* Items */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-700">
                            {itemCount} medicines
                          </td>

                          {/* Auditor */}
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{count.user?.name ?? "Store Admin"}</p>
                              <p className="text-[11px] text-gray-400">{count.user?.email ?? ""}</p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetail(count.id)}
                                className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-700 border-gray-200"
                              >
                                <Eye size={13} />
                                <span>{count.status === "Verified" ? "Inspect" : "Continue"}</span>
                              </Button>

                              {count.status !== "Verified" && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(count.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            {!loading && filteredCounts.length > 0 && total <= 10 && (
              <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-500">
                <span>Showing <strong>{filteredCounts.length}</strong> of {total} total records</span>
              </div>
            )}

            {!loading && (
              <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={10}
                onPageChange={fetchCounts}
                itemLabel="records"
              />
            )}
          </div>
        </div>

      </div>

      {/* ── Detail & Auditing Modal ── */}
      <CountDetailModal
        count={detailCount}
        onClose={() => setDetailCount(null)}
        onFinalize={handleFinalize}
        onUpdate={handleUpdateItem}
        finalizing={finalizing}
      />
    </div>
  );
}
