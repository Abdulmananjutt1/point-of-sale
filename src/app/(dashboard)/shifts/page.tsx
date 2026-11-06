"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, Plus, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, DollarSign, AlertCircle, CalendarDays, ArrowRight,
  ChevronDown, ChevronUp, ReceiptText, TrendingUp, TrendingDown,
  Timer, LogIn, LogOut, User, Banknote, AlertTriangle, Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { toastSuccess, toastApiError } from "@/lib/toast";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { format, formatDistanceStrict } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShiftEntry {
  id: string; description: string;
  amount: number | string; type: "in" | "out"; createdAt: string;
}
interface CashShift {
  id: string; shiftNumber: string; openedBy: string; closedBy?: string;
  openTime: string; closeTime?: string; openingBalance: number | string;
  closingBalance?: number | string; expectedCash?: number | string;
  variance?: number | string; status: "Open" | "Closed";
  notes?: string; entries: ShiftEntry[];
}

const n = (v: number | string | undefined | null) => Number(v ?? 0);

const fmtTime = (d: string) => {
  try { return format(new Date(d), "dd MMM yyyy, hh:mm a"); }
  catch { return d; }
};

const fmtDuration = (open: string, close?: string) => {
  try {
    const end = close ? new Date(close) : new Date();
    return formatDistanceStrict(new Date(open), end);
  } catch { return "—"; }
};

// Extract display name from "Name|email" or plain email format
const parseOpenedBy = (raw: string) => {
  if (raw.includes("|")) return raw.split("|")[0];
  return raw;
};

// ── Shift Summary Modal (shows after closing) ─────────────────────────────────
function ShiftSummaryModal({
  shift,
  onClose,
}: {
  shift: CashShift | null;
  onClose: () => void;
}) {
  if (!shift) return null;

  const cashIns    = shift.entries.filter((e) => e.type === "in").reduce((s, e) => s + n(e.amount), 0);
  const cashOuts   = shift.entries.filter((e) => e.type === "out").reduce((s, e) => s + n(e.amount), 0);
  const opening    = n(shift.openingBalance);
  const closing    = n(shift.closingBalance);
  const expected   = n(shift.expectedCash);
  const variance   = n(shift.variance);
  const isShort    = variance < 0;
  const isOver     = variance > 0;

  return (
    <Modal
      isOpen={!!shift}
      onClose={onClose}
      title="Shift Closed — Summary"
      size="md"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>
            <CheckCircle2 size={14} /> Done
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* Header banner */}
        <div className={`rounded-2xl p-5 flex items-center gap-4 ${
          variance === 0 ? "bg-emerald-50 border border-emerald-200" :
          isShort ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            variance === 0 ? "bg-emerald-100" : isShort ? "bg-red-100" : "bg-amber-100"
          }`}>
            {variance === 0
              ? <CheckCircle2 size={22} className="text-emerald-600" />
              : isShort
              ? <AlertTriangle size={22} className="text-red-500" />
              : <TrendingUp size={22} className="text-amber-600" />
            }
          </div>
          <div>
            <p className={`font-bold text-lg ${
              variance === 0 ? "text-emerald-700" : isShort ? "text-red-700" : "text-amber-700"
            }`}>
              {variance === 0 ? "Perfect Balance!" : isShort ? "Cash Short" : "Cash Over"}
            </p>
            <p className={`text-sm mt-0.5 ${
              variance === 0 ? "text-emerald-600" : isShort ? "text-red-500" : "text-amber-600"
            }`}>
              {variance === 0
                ? "Closing balance matches expected cash exactly."
                : isShort
                ? `PKR ${Math.abs(variance).toLocaleString()} less than expected`
                : `PKR ${variance.toLocaleString()} more than expected`
              }
            </p>
          </div>
        </div>

        {/* Clock-in / Clock-out row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <LogIn size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Clock In</span>
            </div>
            <p className="text-sm font-bold text-gray-800">{fmtTime(shift.openTime)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{parseOpenedBy(shift.openedBy)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <LogOut size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Clock Out</span>
            </div>
            <p className="text-sm font-bold text-gray-800">{shift.closeTime ? fmtTime(shift.closeTime) : "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">{shift.closedBy ?? "—"}</p>
          </div>
        </div>

        {/* Duration pill */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Timer size={15} className="text-violet-500" />
          <span className="text-sm font-semibold text-violet-700">
            Total Duration: {fmtDuration(shift.openTime, shift.closeTime)}
          </span>
        </div>

        {/* Balance breakdown */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Balance Breakdown</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Opening Balance",  value: opening,  icon: Banknote,       positive: true, color: "text-blue-600" },
              { label: "Cash In (entries)",value: cashIns,  icon: ArrowUpCircle,  positive: true, color: "text-emerald-600" },
              { label: "Cash Out (entries)",value: cashOuts, icon: ArrowDownCircle,positive: false,color: "text-red-500" },
              { label: "Expected Cash",    value: expected, icon: DollarSign,     positive: true, color: "text-gray-700" },
              { label: "Actual Closing",   value: closing,  icon: ReceiptText,    positive: true, color: "text-gray-700" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon size={14} className={color} />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
                <span className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</span>
              </div>
            ))}
            {/* Variance row */}
            <div className={`flex items-center justify-between px-4 py-3 ${
              variance === 0 ? "bg-emerald-50" : isShort ? "bg-red-50" : "bg-amber-50"
            }`}>
              <div className="flex items-center gap-2">
                {variance === 0
                  ? <CheckCircle2 size={14} className="text-emerald-600" />
                  : isShort
                  ? <TrendingDown size={14} className="text-red-500" />
                  : <TrendingUp size={14} className="text-amber-600" />
                }
                <span className={`text-sm font-semibold ${
                  variance === 0 ? "text-emerald-700" : isShort ? "text-red-600" : "text-amber-700"
                }`}>Variance</span>
              </div>
              <span className={`text-sm font-bold ${
                variance === 0 ? "text-emerald-600" : isShort ? "text-red-500" : "text-amber-600"
              }`}>
                {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
              </span>
            </div>
          </div>
        </div>

        {/* Entries summary */}
        {shift.entries.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Entries ({shift.entries.length})
            </p>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Description</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shift.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 text-gray-700">{e.description}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${e.type === "in" ? "text-emerald-600" : "text-red-500"}`}>
                        {e.type === "in" ? "+" : "-"}{formatCurrency(n(e.amount))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={e.type === "in" ? "success" : "danger"}>
                          {e.type === "in" ? "In" : "Out"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {shift.notes && (
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-gray-600 border border-slate-100">
            <span className="font-semibold text-gray-700">Notes: </span>{shift.notes}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Shift Card ────────────────────────────────────────────────────────────────
function ShiftCard({
  shift, onAddEntry, onClose,
}: {
  shift: CashShift;
  onAddEntry: (s: CashShift) => void;
  onClose: (s: CashShift) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOpen   = shift.status === "Open";
  const variance = n(shift.variance);
  const cashIns  = shift.entries.filter((e) => e.type === "in").reduce((s, e) => s + n(e.amount), 0);
  const cashOuts = shift.entries.filter((e) => e.type === "out").reduce((s, e) => s + n(e.amount), 0);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
      isOpen ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200"
    }`}>
      {/* ── Header row ── */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-3">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isOpen ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}>
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">{shift.shiftNumber}</span>
              <Badge variant={isOpen ? "success" : "default"}>{isOpen ? "🟢 Open" : "Closed"}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <User size={11} /> {parseOpenedBy(shift.openedBy)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <LogIn size={11} /> {fmtTime(shift.openTime)}
              </span>
              {shift.closeTime && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <LogOut size={11} /> {fmtTime(shift.closeTime)}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-violet-500 font-semibold">
                <Timer size={11} /> {fmtDuration(shift.openTime, shift.closeTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: KPIs + actions */}
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Opening</p>
              <p className="text-sm font-bold text-blue-600">{formatCurrency(n(shift.openingBalance))}</p>
            </div>
            {!isOpen && shift.closingBalance != null && (
              <>
                <ArrowRight size={12} className="text-gray-300" />
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Closing</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(n(shift.closingBalance))}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Variance</p>
                  <p className={`text-sm font-bold ${variance > 0 ? "text-amber-500" : variance < 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOpen && (
              <>
                <Button size="sm" variant="outline" onClick={() => onAddEntry(shift)}>
                  <Plus size={13} /> Entry
                </Button>
                <Button size="sm" variant="danger" onClick={() => onClose(shift)}>
                  <XCircle size={13} /> Close
                </Button>
              </>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Mini KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Opening", value: n(shift.openingBalance), color: "text-blue-600", bg: "bg-blue-50", icon: Banknote },
              { label: "Cash In", value: cashIns,                 color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowUpCircle },
              { label: "Cash Out",value: cashOuts,                color: "text-red-500", bg: "bg-red-50", icon: ArrowDownCircle },
              { label: isOpen ? "Running Bal." : "Closing",
                value: isOpen ? n(shift.openingBalance) + cashIns - cashOuts : n(shift.closingBalance),
                color: "text-violet-600", bg: "bg-violet-50", icon: ReceiptText },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`${bg} rounded-xl p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={color} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                </div>
                <p className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {/* Entries */}
          {shift.entries.length > 0 ? (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Description</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Type</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shift.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-700">{entry.description}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${entry.type === "in" ? "text-emerald-600" : "text-red-500"}`}>
                        {entry.type === "in" ? "+" : "-"}{formatCurrency(n(entry.amount))}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={entry.type === "in" ? "success" : "danger"}>
                          {entry.type === "in" ? "Cash In" : "Cash Out"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400">{fmtTime(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              <ReceiptText size={22} className="mx-auto mb-1.5 text-gray-200" strokeWidth={1.5} />
              No entries recorded
            </div>
          )}

          {!isOpen && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <LogOut size={11} />
                Closed by <strong className="text-gray-600">{shift.closedBy}</strong>
                {shift.closeTime && <> · {fmtTime(shift.closeTime)}</>}
              </div>
              {shift.notes && (
                <span className="text-xs text-gray-400 italic">&ldquo;{shift.notes}&rdquo;</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShiftsPage() {
  const [shifts,  setShifts]  = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(true);

  // After-close summary modal
  const [closedShift, setClosedShift] = useState<CashShift | null>(null);

  // Modals
  const [openModal,   setOpenModal]   = useState(false);
  const [closeModal,  setCloseModal]  = useState(false);
  const [entryModal,  setEntryModal]  = useState(false);
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);

  // Forms
  const [openBal,   setOpenBal]   = useState("");
  const [closeBal,  setCloseBal]  = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [entryDesc, setEntryDesc] = useState("");
  const [entryAmt,  setEntryAmt]  = useState("");
  const [entryType, setEntryType] = useState<"in" | "out">("in");
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await apiGet<CashShift[]>("/cash-shifts");
      setShifts(Array.isArray(raw) ? raw : []);
    } catch (err) { toastApiError(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open Shift ──
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openBal) return;
    setSaving(true);
    try {
      await apiPost("/cash-shifts/open", { openingBalance: Number(openBal) });
      toastSuccess("Shift opened!");
      setOpenModal(false);
      setOpenBal("");
      load();
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  // ── Close Shift — shows summary after success ──
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeBal || !activeShift) return;
    setSaving(true);
    try {
      const updated = await apiPatch<CashShift>(`/cash-shifts/${activeShift.id}/close`, {
        closingBalance: Number(closeBal),
        notes: closeNote || undefined,
      });
      toastSuccess("Shift closed!");
      setCloseModal(false);
      setCloseBal("");
      setCloseNote("");
      setActiveShift(null);
      await load();
      // Show summary — merge entries from activeShift since API may not return them
      const fullShift = await apiGet<CashShift>(`/cash-shifts`).then((all) =>
        (all as unknown as CashShift[]).find((s) => s.id === activeShift.id) ?? updated
      ).catch(() => updated);
      setClosedShift(fullShift ?? updated);
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  // ── Add Entry ──
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDesc || !entryAmt || !activeShift) return;
    setSaving(true);
    try {
      await apiPost(`/cash-shifts/${activeShift.id}/entries`, {
        description: entryDesc, amount: Number(entryAmt), type: entryType,
      });
      toastSuccess("Entry added!");
      setEntryModal(false);
      setEntryDesc(""); setEntryAmt(""); setEntryType("in"); setActiveShift(null);
      load();
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  const currentShift = shifts.find((s) => s.status === "Open") ?? null;
  const closedShifts = shifts.filter((s) => s.status === "Closed");

  return (
    <div className="flex flex-col h-full">
      <Header title="Shift Management" />

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Shifts",  value: shifts.length,         icon: CalendarDays,  color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Currently Open",value: currentShift ? 1 : 0,  icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Closed Shifts", value: closedShifts.length,   icon: XCircle,       color: "text-slate-500",   bg: "bg-slate-100" },
            {
              label: "Avg Duration",
              value: (() => {
                const closed = shifts.filter((s) => s.closeTime);
                if (!closed.length) return "—";
                const avgMins = closed.reduce((acc, s) => {
                  return acc + (new Date(s.closeTime!).getTime() - new Date(s.openTime).getTime()) / 60000;
                }, 0) / closed.length;
                const h = Math.floor(avgMins / 60);
                const m = Math.floor(avgMins % 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
              })(),
              icon: Timer, color: "text-violet-600", bg: "bg-violet-50",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={color} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Active Shift Hero Card ── */}
        {currentShift ? (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Active Shift</span>
                </div>
                <p className="text-xl font-bold">{currentShift.shiftNumber}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs opacity-70">
                  <span className="flex items-center gap-1"><LogIn size={11} /> {fmtTime(currentShift.openTime)}</span>
                  <span className="flex items-center gap-1"><Timer size={11} /> Running for {fmtDuration(currentShift.openTime)}</span>
                  <span className="flex items-center gap-1"><User size={11} /> {parseOpenedBy(currentShift.openedBy)}</span>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-xs opacity-70 uppercase tracking-wide">Opening Balance</span>
                <span className="text-2xl font-bold">{formatCurrency(n(currentShift.openingBalance))}</span>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => { setActiveShift(currentShift); setEntryModal(true); }}
                  >
                    <Plus size={13} /> Add Entry
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-500/80 hover:bg-red-500 text-white border-0"
                    onClick={() => { setActiveShift(currentShift); setCloseModal(true); }}
                  >
                    <XCircle size={13} /> Close Shift
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800">No active shift</p>
                <p className="text-sm text-amber-600 mt-0.5">Open a new shift to start recording cash transactions.</p>
              </div>
              <Button size="sm" onClick={() => setOpenModal(true)} className="shrink-0">
                <Plus size={13} /> Open Shift
              </Button>
            </div>
          )
        )}

        {/* ── Section header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Shift History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{shifts.length} total shifts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            {!currentShift && (
              <Button size="sm" onClick={() => setOpenModal(true)}>
                <Plus size={13} /> Open Shift
              </Button>
            )}
          </div>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                    <div className="h-3 bg-slate-100 rounded w-56" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
            <Clock size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium">No shifts yet</p>
            <p className="text-sm text-gray-400 mt-1">Open your first shift to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onAddEntry={(s) => { setActiveShift(s); setEntryModal(true); }}
                onClose={(s)    => { setActiveShift(s); setCloseModal(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── After-close Summary Modal ── */}
      <ShiftSummaryModal shift={closedShift} onClose={() => setClosedShift(null)} />

      {/* ── Open Shift Modal ── */}
      <Modal
        isOpen={openModal}
        onClose={() => { setOpenModal(false); setOpenBal(""); }}
        title="Open New Shift"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleOpenShift} isLoading={saving} disabled={!openBal}>
              <CheckCircle2 size={13} /> Open Shift
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700 border border-emerald-100">
            Count the cash in the till and enter the opening balance to start the shift.
          </div>
          <Input
            label="Opening Balance (PKR)"
            type="number" min="0" step="0.01" placeholder="e.g. 5000"
            value={openBal}
            onChange={(e) => setOpenBal(e.target.value)}
            leftIcon={<DollarSign size={14} />}
            required
          />
        </form>
      </Modal>

      {/* ── Close Shift Modal ── */}
      <Modal
        isOpen={closeModal}
        onClose={() => { setCloseModal(false); setCloseBal(""); setCloseNote(""); }}
        title="Close Shift"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCloseModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleCloseShift} isLoading={saving} disabled={!closeBal}>
              <XCircle size={13} /> Close & View Summary
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          {activeShift && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm border border-slate-100">
              <div className="flex justify-between">
                <span className="text-gray-400">Shift</span>
                <span className="font-semibold">{activeShift.shiftNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Clock In</span>
                <span className="font-semibold">{fmtTime(activeShift.openTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Running For</span>
                <span className="font-semibold text-violet-600">{fmtDuration(activeShift.openTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Balance</span>
                <span className="font-semibold text-blue-600">{formatCurrency(n(activeShift.openingBalance))}</span>
              </div>
            </div>
          )}
          <Input
            label="Actual Closing Balance (PKR)"
            type="number" min="0" step="0.01"
            placeholder="Count cash in till and enter here"
            value={closeBal}
            onChange={(e) => setCloseBal(e.target.value)}
            leftIcon={<DollarSign size={14} />}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2} placeholder="Any remarks for this shift…"
              value={closeNote} onChange={(e) => setCloseNote(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* ── Add Entry Modal ── */}
      <Modal
        isOpen={entryModal}
        onClose={() => { setEntryModal(false); setEntryDesc(""); setEntryAmt(""); setEntryType("in"); }}
        title="Add Cash Entry"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEntryModal(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} isLoading={saving} disabled={!entryDesc || !entryAmt}>
              <Plus size={13} /> Add Entry
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["in", "out"] as const).map((t) => (
              <button
                key={t} type="button" onClick={() => setEntryType(t)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  entryType === t
                    ? t === "in" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-600"
                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                {t === "in" ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                Cash {t === "in" ? "In" : "Out"}
              </button>
            ))}
          </div>
          <Input
            label="Description"
            placeholder={entryType === "in" ? "e.g. Cash sale received" : "e.g. Petty cash withdrawal"}
            value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} required
          />
          <Input
            label="Amount (PKR)"
            type="number" min="0.01" step="0.01" placeholder="0.00"
            value={entryAmt} onChange={(e) => setEntryAmt(e.target.value)}
            leftIcon={<DollarSign size={14} />} required
          />
        </form>
      </Modal>
    </div>
  );
}
