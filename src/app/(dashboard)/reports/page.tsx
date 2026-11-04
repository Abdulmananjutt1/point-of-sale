"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Users, Package,
  RefreshCw, RotateCcw, Tag, Search, Calendar,
  Download, ArrowUpRight, Award, CreditCard,
  FileSpreadsheet, Sparkles, Filter, X, Check,
} from "lucide-react";
import { reportService, ReportData } from "@/services/reportService";
import { toastApiError, toastSuccess } from "@/lib/toast";

const PAYMENT_THEMES: Record<string, { fill: string; bg: string; text: string; border: string }> = {
  Cash:      { fill: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Card:      { fill: "#3b82f6", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
  UBL:       { fill: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  JazzCash:  { fill: "#ef4444", bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"    },
  EasyPaisa: { fill: "#059669", bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200"    },
};

const DATE_PRESETS = [
  { label: "Today",       days: 0  },
  { label: "Last 7 Days", days: 7  },
  { label: "Last 30 Days",days: 30 },
  { label: "Last 90 Days",days: 90 },
  { label: "All Time",    days: -1 },
];

function getDateRange(days: number): { from: string; to: string } | undefined {
  if (days < 0) return undefined;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString().split("T")[0],
    to:   to.toISOString().split("T")[0],
  };
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="w-9 h-9 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-7 bg-gray-200 rounded w-32" />
      <div className="h-2.5 bg-gray-100 rounded w-20" />
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData]               = useState<ReportData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [preset, setPreset]           = useState(1); // default "Last 7 Days"
  const [customFrom, setCustomFrom]   = useState("");
  const [customTo, setCustomTo]       = useState("");
  const [useCustom, setUseCustom]     = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let params: { from?: string; to?: string } | undefined;
      if (useCustom && customFrom && customTo) {
        params = { from: customFrom, to: customTo };
      } else {
        params = getDateRange(DATE_PRESETS[preset].days);
      }
      const result = await reportService.getSummary(params);
      setData(result);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [preset, useCustom, customFrom, customTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setUseCustom(true);
    fetchReport();
  };

  const filteredSales = (data?.recentSales ?? []).filter((s) => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.paymentMethod.toLowerCase().includes(q)
    );
  });

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, data]);

  const paginatedSales = filteredSales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportCSV = () => {
    if (!data?.recentSales.length) {
      toastApiError("No transactions to export");
      return;
    }
    try {
      const csv = [
        ["Invoice Number", "Customer Name", "Items Count", "Payment Method", "Discount", "Total Amount", "Status", "Date"].join(","),
        ...filteredSales.map((s) => [
          s.invoiceNumber,
          s.customerName,
          s.itemCount,
          s.paymentMethod,
          s.discount,
          s.total,
          s.status,
          s.createdAt,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pharmacy-sales-report-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Sales report exported successfully");
    } catch (err) {
      toastApiError(err);
    }
  };

  const grossRevenue = data?.summary.totalRevenue ?? 0;
  const totalRefunded = data?.summary.totalRefunded ?? 0;
  const netRevenue = Math.max(0, grossRevenue - totalRefunded);
  const totalSalesCount = data?.summary.totalSales ?? 0;
  const totalReturnsCount = data?.summary.totalReturns ?? 0;
  const refundRate = totalSalesCount > 0 ? ((totalReturnsCount / totalSalesCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <Header title="Reports & Analytics" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header / Sub-banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Financial & Sales Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              Revenue performance, transaction metrics, medication sales rankings, and revenue distributions.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchReport}
              disabled={loading}
              className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </Button>
            {data?.recentSales && data.recentSales.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Date Filter & Period Selector ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {DATE_PRESETS.map((p, i) => {
              const active = !useCustom && preset === i;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setPreset(i); setUseCustom(false); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-transparent"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker */}
          <form onSubmit={handleApplyCustomDates} className="flex items-center gap-2 self-start md:self-auto flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-700">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent focus:outline-none text-xs text-gray-800"
                aria-label="Start Date"
              />
              <span className="text-gray-400 font-medium">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent focus:outline-none text-xs text-gray-800"
                aria-label="End Date"
              />
            </div>
            <Button
              size="sm"
              type="submit"
              disabled={!customFrom || !customTo}
              className="text-xs py-1.5 px-3 h-auto"
            >
              Apply
            </Button>
          </form>
        </div>

        {/* ── Executive Metric KPI Cards (Top Banner) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              {/* Gross Revenue */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Gross Revenue</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                    {formatCurrency(grossRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {totalSalesCount} completed transactions
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <TrendingUp size={22} />
                </div>
              </div>

              {/* Net Revenue */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Net Revenue</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tracking-tight">
                    {formatCurrency(netRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">After refunds:</span>
                    <span className="font-semibold text-rose-600">-{formatCurrency(totalRefunded)}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <ShoppingCart size={22} />
                </div>
              </div>

              {/* Average Order Value */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Avg. Basket Value</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-mono tracking-tight">
                    {formatCurrency(data?.summary.avgOrderValue ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500">Average spending per receipt</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <CreditCard size={22} />
                </div>
              </div>

              {/* Discounts & Refunds Rate */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Discounts & Returns</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
                    {formatCurrency(data?.summary.totalDiscount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="text-gray-400">Refund Rate:</span>
                    <span className="font-semibold text-rose-600">{refundRate}% ({totalReturnsCount})</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Tag size={22} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Store Volume Mini Indicators ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-gray-400">Customers</p>
              <p className="text-base font-bold text-gray-900">{data?.summary.totalCustomers ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-gray-400">Medicines</p>
              <p className="text-base font-bold text-gray-900">{data?.summary.totalMedicines ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <RotateCcw size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-gray-400">Returned Units</p>
              <p className="text-base font-bold text-gray-900">{totalReturnsCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-gray-400">Success Ratio</p>
              <p className="text-base font-bold text-gray-900">
                {totalSalesCount > 0 ? (100 - Number(refundRate)).toFixed(1) : 100}%
              </p>
            </div>
          </div>
        </div>

        {/* ── Charts & Leaderboards Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Payment Method Distribution (Left: 6 cols) */}
          <div className="lg:col-span-6">
            <Card>
              <div className="p-6 pb-2 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Sales by Payment Gateway</h3>
                  <p className="text-xs text-gray-500">Distribution across Cash, Cards, and Digital Wallets</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
              </div>

              <div className="p-6 space-y-5">
                {loading ? (
                  <div className="h-56 flex items-center justify-center animate-pulse">
                    <div className="w-full h-44 bg-gray-100 rounded-xl" />
                  </div>
                ) : !data || data.paymentBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-xs">
                    <CreditCard size={32} className="text-gray-300 mb-2" />
                    No payment breakdown available for this period.
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.paymentBreakdown} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="method"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(val, name) => [
                            name === "count" ? `${val} orders` : formatCurrency(Number(val)),
                            name === "count" ? "Transactions" : "Revenue",
                          ]}
                          contentStyle={{
                            borderRadius: 12,
                            fontSize: 12,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {data.paymentBreakdown.map((entry) => (
                            <Cell key={entry.method} fill={PAYMENT_THEMES[entry.method]?.fill ?? "#64748b"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Method Detail Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100">
                      {data.paymentBreakdown.map((entry) => {
                        const theme = PAYMENT_THEMES[entry.method] ?? {
                          bg: "bg-gray-50",
                          text: "text-gray-700",
                          border: "border-gray-200",
                        };
                        return (
                          <div
                            key={entry.method}
                            className={`p-2.5 rounded-xl border ${theme.bg} ${theme.border} text-xs space-y-0.5`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${theme.text}`}>{entry.method}</span>
                              <span className="font-mono text-gray-500 font-bold">{entry.count}</span>
                            </div>
                            <p className="font-bold text-gray-800 text-[11px] font-mono">
                              {formatCurrency(entry.revenue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Top Selling Medications Leaderboard (Right: 6 cols) */}
          <div className="lg:col-span-6">
            <Card>
              <div className="p-6 pb-2 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Top Selling Medications</h3>
                  <p className="text-xs text-gray-500">Ranked by revenue contribution</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award size={16} />
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gray-200 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                          <div className="h-2 bg-gray-100 rounded w-full" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-16" />
                      </div>
                    ))}
                  </div>
                ) : !data || data.topMedicines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-xs">
                    <Package size={32} className="text-gray-300 mb-2" />
                    No medicine sales records found for this period.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {data.topMedicines.slice(0, 7).map((med, idx) => {
                      const topRevenue = data.topMedicines[0]?.revenue || 1;
                      const percentage = Math.min((med.revenue / topRevenue) * 100, 100);
                      const isTop3 = idx < 3;

                      return (
                        <div
                          key={med.medicineId}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Rank badge */}
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs"
                              : idx === 1
                              ? "bg-slate-200 text-slate-800 border border-slate-300"
                              : idx === 2
                              ? "bg-orange-100 text-orange-800 border border-orange-200"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {idx + 1}
                          </div>

                          {/* Medicine Name & Volume Bar */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{med.name}</p>
                              <span className="font-mono text-sm font-bold text-gray-900 ml-2">
                                {formatCurrency(med.revenue)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isTop3 ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gray-400"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-gray-500 shrink-0">
                                {med.qty} sold
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>

        {/* ── Transaction Ledger Table ── */}
        <Card padding={false}>
          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Detailed Sales Ledger</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filteredSales.length} of {data?.recentSales.length ?? 0} transaction records
              </p>
            </div>

            {/* Table Search */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search invoice, customer…"
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Invoice ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5 text-center">Items</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-gray-400 text-xs">
                      No transactions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">
                        {sale.invoiceNumber}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {sale.customerName || "Walk-in Customer"}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-gray-600">
                        {sale.itemCount}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge>{sale.paymentMethod}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold font-mono text-emerald-600">
                        {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-bold font-mono text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            sale.status === "Completed"
                              ? "success"
                              : sale.status === "Refunded"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(sale.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredSales.length > 0 && filteredSales.length <= 10 && (
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {filteredSales.length} of {data?.recentSales.length ?? 0} transactions</span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download size={13} /> Export view as CSV
              </button>
            </div>
          )}

          {!loading && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredSales.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="transactions"
            />
          )}
        </Card>

      </div>
    </div>
  );
}
