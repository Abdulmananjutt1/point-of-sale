"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  ReceiptText,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Boxes,
  Percent,
  Warehouse,
  Sparkles,
  CreditCard,
  Building2,
  Calendar,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { apiGet, apiPost } from "@/lib/apiClient";

type DateRange = "today" | "yesterday" | "7d" | "30d";

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
];

const PAYMENT_COLORS: Record<string, string> = {
  Cash: "#10b981",
  Card: "#6366f1",
  UBL: "#f59e0b",
  JazzCash: "#ef4444",
  EasyPaisa: "#06b6d4",
};

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    grossMarginPct: number;
    totalExpenses: number;
    netProfit: number;
    totalTransactions: number;
    avgBillValue: number;
    uniqueCustomers: number;
    walkInCount: number;
    totalDiscount: number;
  };
  alerts: {
    outOfStock: number;
    lowStock: number;
    expiringSoon: number;
    expired: number;
    totalAlerts: number;
  };
  paymentBreakdown: { method: string; count: number; amount: number }[];
  topMedicines: { medicineId: string; name: string; qty: number; revenue: number }[];
  inventoryCounts: { total: number; customers: number };
  lowStockItems: {
    id: string;
    name: string;
    brand: string;
    stock: number;
    minStock: number;
    unit: string;
  }[];
  nearExpiry: {
    id: string;
    name: string;
    brand: string;
    batchNumber: string;
    expiryDate: string;
    isExpired: boolean;
  }[];
  recentSales: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    total: number;
    discount: number;
    paymentMethod: string;
    status: string;
    itemCount: number;
    createdAt: string;
  }[];
  trend: { label: string; revenue: number; transactions: number }[];
}

// ── Skeletons ──────────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-6 bg-slate-200 rounded w-28" />
          <div className="h-2 bg-slate-100 rounded w-16" />
        </div>
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [expenseModal, setExpenseModal] = useState(false);
  const [expForm, setExpForm] = useState({
    description: "",
    amount: "",
    category: "Utilities",
    date: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    setExpForm((f) => ({ ...f, date: new Date().toISOString().split("T")[0] }));
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiGet<DashboardData>("/dashboard", { range: dateRange });
      setData(result);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.description || !expForm.amount) return;
    setSavingExpense(true);
    try {
      await apiPost("/expenses", {
        description: expForm.description,
        amount: Number(expForm.amount),
        category: expForm.category,
        date: expForm.date || new Date().toISOString().split("T")[0],
      });
      toastSuccess("Operating expense recorded");
      setExpForm({
        description: "",
        amount: "",
        category: "Utilities",
        date: new Date().toISOString().split("T")[0],
      });
      setExpenseModal(false);
      fetchDashboard();
    } catch (err) {
      toastApiError(err);
    } finally {
      setSavingExpense(false);
    }
  };

  const isLoading = loading || !data;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Pharmacy Executive Dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Control Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Sparkles size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Executive Performance Overview</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time revenue metrics, profit margins, inventory depletion alerts, and recent POS orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Range Selector */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
              {DATE_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateRange(key)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    dateRange === key
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "hover:text-slate-900 text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchDashboard}
              disabled={loading}
              title="Refresh Analytics"
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpenseModal(true)}
              className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Plus size={15} />
              Log Expense
            </Button>

            <Button
              size="sm"
              onClick={() => router.push("/sales")}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-600/20"
            >
              <ShoppingCart size={15} />
              Open POS
            </Button>
          </div>
        </div>

        {/* Operational Alert Strip */}
        {!isLoading && data.alerts.totalAlerts > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.alerts.outOfStock > 0 && (
              <AlertTile
                icon={Package}
                color="red"
                label="Out of Stock Items"
                count={data.alerts.outOfStock}
                href="/inventory?filter=out-of-stock"
              />
            )}
            {data.alerts.lowStock > 0 && (
              <AlertTile
                icon={AlertTriangle}
                color="yellow"
                label="Low Stock Warnings"
                count={data.alerts.lowStock}
                href="/inventory?filter=low-stock"
              />
            )}
            {data.alerts.expiringSoon > 0 && (
              <AlertTile
                icon={Clock}
                color="orange"
                label="Expiring (within 30d)"
                count={data.alerts.expiringSoon}
                href="/inventory?filter=expiring"
              />
            )}
            {data.alerts.expired > 0 && (
              <AlertTile
                icon={AlertCircle}
                color="red"
                label="Expired Batches"
                count={data.alerts.expired}
                href="/inventory?filter=expired"
              />
            )}
          </div>
        )}

        {/* Core Financial KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                title="Gross Revenue"
                value={formatCurrency(data.kpis.totalRevenue)}
                icon={TrendingUp}
                color="emerald"
                sub={`${data.kpis.totalTransactions} transactions`}
              />
              <KpiCard
                title="Cost of Goods (COGS)"
                value={formatCurrency(data.kpis.totalCOGS)}
                icon={Package}
                color="indigo"
                sub="Wholesale cost"
              />
              <KpiCard
                title="Gross Profit"
                value={formatCurrency(data.kpis.grossProfit)}
                sub={`${data.kpis.grossMarginPct.toFixed(1)}% margin`}
                icon={DollarSign}
                color={data.kpis.grossProfit >= 0 ? "emerald" : "red"}
              />
              <KpiCard
                title="Store Expenses"
                value={formatCurrency(data.kpis.totalExpenses)}
                icon={TrendingDown}
                color="orange"
                sub="Utilities & overhead"
              />
              <KpiCard
                title="Net Profit"
                value={formatCurrency(data.kpis.netProfit)}
                icon={data.kpis.netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
                color={data.kpis.netProfit >= 0 ? "emerald" : "red"}
                sub={data.kpis.netProfit >= 0 ? "Surplus after cost" : "Net deficit"}
              />
              <KpiCard
                title="Average Ticket"
                value={formatCurrency(data.kpis.avgBillValue)}
                sub={`Avg bill value`}
                icon={ReceiptText}
                color="blue"
              />
            </>
          )}
        </div>

        {/* Secondary Snapshot Bar */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex items-center justify-between"
              >
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-6 bg-slate-100 rounded w-10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SmallStat
              label="Unique Active Patients"
              value={data.kpis.uniqueCustomers}
              icon={Users}
            />
            <SmallStat
              label="Walk-In Receipts"
              value={data.kpis.walkInCount}
              icon={ReceiptText}
            />
            <SmallStat
              label="Medicine Catalog Items"
              value={data.inventoryCounts.total}
              icon={Boxes}
            />
            <SmallStat
              label="Registered Members"
              value={data.inventoryCounts.customers}
              icon={UserCheck}
            />
          </div>
        )}

        {/* Analytical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Sales Trend Area Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revenue & Sales Timeline</h3>
                <p className="text-xs text-slate-500">Sales volume performance over selected period</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg">
                PKR Valuation
              </span>
            </div>

            {isLoading ? (
              <div className="h-[220px] flex items-center justify-center animate-pulse">
                <div className="w-full h-full bg-slate-50 rounded-xl" />
              </div>
            ) : data.trend.length > 0 && data.trend.some((t) => t.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.trend} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashboardRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#dashboardRevGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <TrendingUp size={36} className="text-slate-300 mb-2" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-slate-600">No revenue data for this range</p>
                <p className="text-xs text-slate-400 mt-0.5">Transactions will populate here in real-time</p>
              </div>
            )}
          </div>

          {/* Payment Gateway Distribution Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment Breakdown</h3>
                  <p className="text-xs text-slate-500">Sales channels and payment types</p>
                </div>
                <CreditCard size={18} className="text-slate-400" />
              </div>

              {isLoading ? (
                <div className="space-y-3 animate-pulse pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : data.paymentBreakdown.length > 0 ? (
                <div className="pt-1">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={data.paymentBreakdown}
                      layout="vertical"
                      margin={{ left: -10, right: 10, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="method"
                        type="category"
                        tick={{ fontSize: 11, fill: "#475569" }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                      />
                      <Tooltip
                        formatter={(v: number, name: string) => [
                          name === "count" ? `${v} orders` : formatCurrency(v),
                          name === "count" ? "Transactions" : "Revenue",
                        ]}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.paymentBreakdown.map((entry) => (
                          <Cell
                            key={entry.method}
                            fill={PAYMENT_COLORS[entry.method] ?? "#64748b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                    {data.paymentBreakdown.map((e) => (
                      <div key={e.method} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: PAYMENT_COLORS[e.method] ?? "#64748b" }}
                          />
                          <span className="font-medium text-slate-700">{e.method}</span>
                          <span className="text-[10px] text-slate-400">({e.count} sales)</span>
                        </div>
                        <span className="font-bold text-slate-900">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-slate-400">
                  <p className="text-xs">No payment breakdown available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Medicines & Imminent Expiries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Selling Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Top Selling Formulations</h3>
                <p className="text-xs text-slate-500">Highest revenue items during this period</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                Leaderboard
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-2 bg-slate-100 rounded" />
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : data.topMedicines.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Boxes size={32} className="mx-auto mb-2 text-slate-300" strokeWidth={1.5} />
                <p className="text-xs">No sales recorded yet for this date range</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topMedicines.slice(0, 5).map((med, i) => (
                  <div key={med.medicineId} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 text-xs font-black rounded-lg flex items-center justify-center shrink-0 ${
                        i === 0
                          ? "bg-amber-100 text-amber-800"
                          : i === 1
                          ? "bg-slate-200 text-slate-700"
                          : i === 2
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{med.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                (med.revenue / (data.topMedicines[0]?.revenue || 1)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 shrink-0">
                          {med.qty} sold
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 shrink-0">
                      {formatCurrency(med.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Alerts Top List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Batch Expiry Watchlist</h3>
                <p className="text-xs text-slate-500">Expired batches or expiring within 30 days</p>
              </div>
              {!isLoading && data.nearExpiry.length > 0 && (
                <Link
                  href="/inventory?filter=expiring"
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  View All ({data.nearExpiry.length}) <ChevronRight size={13} />
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2.5 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-36" />
                      <div className="h-2 bg-slate-100 rounded w-24" />
                    </div>
                    <div className="h-5 bg-slate-100 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : data.nearExpiry.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500" strokeWidth={1.5} />
                <p className="text-sm font-bold text-slate-800">All Batches Healthy</p>
                <p className="text-xs text-slate-400 mt-0.5">No products currently near expiration</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.nearExpiry.slice(0, 5).map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-1.5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{med.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Batch: {med.batchNumber} · {med.brand}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant={med.isExpired ? "danger" : "warning"}>
                        {med.isExpired ? "Expired" : "Expiring"}
                      </Badge>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {formatDate(med.expiryDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items Section */}
        {!isLoading && data.lowStockItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Depleted & Low Stock Alert List</h3>
                <p className="text-xs text-slate-500">Medicines running at or below safety reorder threshold</p>
              </div>
              <Link
                href="/inventory?filter=low-stock"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                View Full List <ChevronRight size={13} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3">Medicine Formulation</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3 text-center">Current Stock</th>
                    <th className="px-4 py-3 text-center">Min Required</th>
                    <th className="px-4 py-3">Urgency Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.brand}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-black text-sm ${
                            item.stock === 0 ? "text-rose-600" : "text-amber-600"
                          }`}
                        >
                          {item.stock} {item.unit}s
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-xs font-medium">
                        {item.minStock} {item.unit}s
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.stock === 0 ? "danger" : "warning"}>
                          {item.stock === 0 ? "Out of Stock" : "Low Stock"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/purchase-orders`)}
                          className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 py-1"
                        >
                          Create PO
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent POS Receipts</h3>
              <p className="text-xs text-slate-500">Live transaction stream for selected date period</p>
            </div>
            <Link
              href="/reports"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
            >
              Full Ledger <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Patient / Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                ) : (data.recentSales ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No customer transactions recorded in this period
                    </td>
                  </tr>
                ) : (
                  (data.recentSales ?? []).slice(0, 6).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-slate-800">
                        {s.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.customerName}</td>
                      <td className="px-4 py-3 text-center text-slate-500 text-xs">{s.itemCount}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 text-right">
                        {formatCurrency(s.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            s.status === "Completed"
                              ? "success"
                              : s.status === "Refunded"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs text-right whitespace-nowrap font-mono">
                        {new Date(s.createdAt).toLocaleTimeString("en-PK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Operating Expense Modal */}
      <Modal
        isOpen={expenseModal}
        onClose={() => setExpenseModal(false)}
        title="Record Operating Expense"
        size="sm"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Input
            label="Expense Description *"
            value={expForm.description}
            onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
            placeholder="e.g. Generator Fuel / Electricity Bill"
            required
          />

          <Input
            label="Amount (PKR) *"
            type="number"
            min={1}
            value={expForm.amount}
            onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
            placeholder="0.00"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Category
            </label>
            <select
              value={expForm.category}
              onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {["Utilities", "Salaries", "Rent", "Supplies", "Maintenance", "Packaging", "Other"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          <Input
            label="Transaction Date"
            type="date"
            value={expForm.date}
            onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
          />

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              className="flex-1"
              type="button"
              onClick={() => setExpenseModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              type="submit"
              disabled={savingExpense}
            >
              {savingExpense ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: "emerald" | "indigo" | "blue" | "red" | "orange";
}) {
  const styles = {
    emerald: { bg: "bg-emerald-50", fg: "text-emerald-600", border: "border-emerald-100" },
    indigo: { bg: "bg-indigo-50", fg: "text-indigo-600", border: "border-indigo-100" },
    blue: { bg: "bg-blue-50", fg: "text-blue-600", border: "border-blue-100" },
    red: { bg: "bg-rose-50", fg: "text-rose-600", border: "border-rose-100" },
    orange: { bg: "bg-amber-50", fg: "text-amber-600", border: "border-amber-100" },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>
        <div className={`p-2 rounded-xl shrink-0 ${styles.bg}`}>
          <Icon className={`w-4 h-4 ${styles.fg}`} />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500 font-medium truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </div>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <span className="text-lg font-black text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}

function AlertTile({
  icon: Icon,
  color,
  label,
  count,
  href,
}: {
  icon: React.ElementType;
  color: "red" | "yellow" | "orange";
  label: string;
  count: number;
  href: string;
}) {
  const styles = {
    red: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      icon: "text-rose-500",
      text: "text-rose-900",
      sub: "text-rose-700",
    },
    yellow: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-500",
      text: "text-amber-900",
      sub: "text-amber-700",
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "text-orange-500",
      text: "text-orange-900",
      sub: "text-orange-700",
    },
  }[color];

  return (
    <Link
      href={href}
      className={`${styles.bg} ${styles.border} border rounded-2xl p-3.5 flex items-center gap-3 hover:shadow-xs transition-all`}
    >
      <div className="p-2 rounded-xl bg-white shadow-xs">
        <Icon size={20} className={`${styles.icon} shrink-0`} />
      </div>
      <div>
        <p className={`text-lg font-black ${styles.text}`}>{count}</p>
        <p className={`text-xs font-medium ${styles.sub}`}>{label}</p>
      </div>
    </Link>
  );
}
