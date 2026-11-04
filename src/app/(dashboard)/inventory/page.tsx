"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Package,
  TrendingUp,
  ArrowUpDown,
  PackagePlus,
  Filter,
  Loader2,
  RefreshCw,
  Boxes,
  DollarSign,
  AlertTriangle,
  Clock,
  Download,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  Percent,
  Warehouse,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import AlertBanner from "@/components/inventory/AlertBanner";
import StockBar from "@/components/inventory/StockBar";
import ExpiryBadge from "@/components/inventory/ExpiryBadge";
import StockAdjustModal from "@/components/inventory/StockAdjustModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useInventoryAlerts } from "@/hooks/useInventoryAlerts";
import { Medicine, Supplier } from "@/types";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { medicineService } from "@/services/medicineService";
import { supplierService } from "@/services/supplierService";

type FilterKey = "all" | "out-of-stock" | "low-stock" | "expiring" | "expired";
type SortKey = "name" | "stock" | "expiry" | "value";
type SortDir = "asc" | "desc";

export default function InventoryPage() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [adjustingMed, setAdjustingMed] = useState<Medicine | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medResult, supResult] = await Promise.all([
        medicineService.getAll({ limit: 500 }),
        supplierService.getAll(),
      ]);
      setMedicines(medResult.medicines);
      setSuppliers(supResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory valuation data");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const alerts = useInventoryAlerts(medicines, now);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCost = medicines.reduce((s, m) => s + m.stock * m.purchasePrice, 0);
    const totalRetail = medicines.reduce((s, m) => s + m.stock * m.sellingPrice, 0);
    const totalUnits = medicines.reduce((s, m) => s + m.stock, 0);
    const potentialMargin =
      totalRetail > 0 ? (((totalRetail - totalCost) / totalRetail) * 100).toFixed(1) : "0";

    return { totalCost, totalRetail, totalUnits, potentialMargin };
  }, [medicines]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (!now) return filter === "all";

      switch (filter) {
        case "out-of-stock":
          return m.stock === 0;
        case "low-stock":
          return m.stock > 0 && m.stock <= m.minStock;
        case "expiring":
          return !isExpiredFn(m.expiryDate, now) && isExpiringSoonFn(m.expiryDate, now);
        case "expired":
          return isExpiredFn(m.expiryDate, now);
        default:
          return true;
      }
    });
  }, [medicines, search, filter, now]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sortedMedicines = useMemo(() => {
    return [...filteredMedicines].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "stock") cmp = a.stock - b.stock;
      else if (sortKey === "expiry")
        cmp = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      else if (sortKey === "value")
        cmp = a.stock * a.purchasePrice - b.stock * b.purchasePrice;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredMedicines, sortKey, sortDir]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, sortKey, sortDir]);

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedMedicines.slice(start, start + PAGE_SIZE);
  }, [sortedMedicines, currentPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Stock adjust ───────────────────────────────────────────────────────────
  const handleAdjust = async (medicineId: string, adjustment: number) => {
    try {
      const updated = await medicineService.adjustStock(medicineId, adjustment);
      setMedicines((prev) => prev.map((m) => (m.id === medicineId ? updated : m)));
      toastSuccess("Inventory stock updated successfully");
      setAdjustingMed(null);
    } catch (err) {
      toastApiError(err);
    }
  };

  const supplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.name ?? "Direct Manufacturer";

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All Stock", count: medicines.length },
    { key: "out-of-stock", label: "Out of Stock", count: alerts.outOfStock.length },
    { key: "low-stock", label: "Low Stock", count: alerts.lowStock.length },
    { key: "expiring", label: "Expiring (30d)", count: alerts.expiringSoon.length },
    { key: "expired", label: "Expired", count: alerts.expired.length },
  ];

  const exportCSV = () => {
    if (medicines.length === 0) return;
    const headers = [
      "Medicine Name",
      "Generic Formula",
      "Brand",
      "Category",
      "Batch Number",
      "Stock Count",
      "Unit Cost (PKR)",
      "Total Cost Value (PKR)",
      "Retail Price (PKR)",
      "Total Retail Value (PKR)",
      "Expiry Date",
      "Supplier",
    ];
    const rows = medicines.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.genericName.replace(/"/g, '""')}"`,
      `"${m.brand.replace(/"/g, '""')}"`,
      `"${m.category}"`,
      `"${m.batchNumber}"`,
      m.stock,
      m.purchasePrice,
      m.stock * m.purchasePrice,
      m.sellingPrice,
      m.stock * m.sellingPrice,
      `"${formatDate(m.expiryDate)}"`,
      `"${supplierName(m.supplierId).replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_valuation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/60">
        <Header title="Inventory Valuation" />
        <div className="flex flex-col items-center justify-center h-80 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
          <span className="text-sm font-semibold text-slate-600">Calculating inventory valuations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/60">
        <Header title="Inventory Valuation" />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
          <p className="text-rose-700 font-bold">{error}</p>
          <Button onClick={fetchAll} variant="outline" className="border-rose-300">
            <RefreshCw size={14} className="mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Inventory Valuation & Stock Levels" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Warehouse size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Inventory Valuation & On-Hand Assets</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live warehouse asset tracking, procurement cost basis, retail sales projections, and stock corrections.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={medicines.length === 0}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Download size={15} />
              Export Valuation CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAll}
              disabled={loading}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inventory Cost Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset Valuation (Cost)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalCost)}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Boxes size={13} className="text-emerald-500" />
                {stats.totalUnits.toLocaleString()} total units on hand
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>

          {/* Retail Potential Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retail Sales Potential</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalRetail)}</h3>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <Percent size={13} />
                ~{stats.potentialMargin}% projected gross margin
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>

          {/* Formulations Count */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Formulations</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{medicines.length}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Registered in catalogue
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Discrepancy & Alerts</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{alerts.totalAlerts}</h3>
              <p
                className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  alerts.totalAlerts > 0 ? "text-rose-600 font-semibold" : "text-slate-500"
                }`}
              >
                <AlertTriangle size={13} />
                {alerts.outOfStock.length} out · {alerts.lowStock.length} low · {alerts.expired.length} expired
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                alerts.totalAlerts > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
              }`}
            >
              <Filter size={24} />
            </div>
          </div>
        </div>

        {/* Alert Banners Strip */}
        <AlertBanner alerts={alerts} onFilterClick={(key) => setFilter(key as FilterKey)} />

        {/* Toolbar: Search & Segmented Filter Controller */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medicine, brand, formula, batch..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600 flex-wrap">
              {filterTabs.map(({ key, label, count }) => {
                const isActive = filter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-white text-slate-900 shadow-xs font-semibold"
                        : "hover:text-slate-900 text-slate-600"
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && key !== "all" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          key === "out-of-stock" || key === "expired"
                            ? "bg-rose-100 text-rose-700"
                            : key === "low-stock"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <SortTh label="Medicine Formulation" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Batch & Sourced Supplier</th>
                  <SortTh label="Stock Level" sortKey="stock" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortTh label="Asset Value (Cost)" sortKey="value" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortTh label="Batch Expiry" sortKey="expiry" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                      <Package size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                      <h4 className="text-base font-semibold text-slate-700">No Inventory Found</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No medicines match your active search or filter selection.
                      </p>
                      {(search || filter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setFilter("all");
                          }}
                          className="mt-4"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedMedicines.map((med) => (
                    <InventoryRow
                      key={med.id}
                      medicine={med}
                      now={now}
                      supplierName={supplierName(med.supplierId)}
                      onAdjust={() => setAdjustingMed(med)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {sortedMedicines.length > 0 && sortedMedicines.length <= 10 && (
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-700">{sortedMedicines.length}</strong> of{" "}
                <strong className="text-slate-700">{medicines.length}</strong> inventory products
              </span>
              <span className="hidden sm:inline">Click Adjust on any product to register immediate stock corrections</span>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={sortedMedicines.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemLabel="inventory products"
          />
        </div>
      </div>

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        medicine={adjustingMed}
        isOpen={!!adjustingMed}
        onClose={() => setAdjustingMed(null)}
        onAdjust={handleAdjust}
      />
    </div>
  );
}

// ── Inventory Row Component ────────────────────────────────────────────────────
function InventoryRow({
  medicine: med,
  now,
  supplierName,
  onAdjust,
}: {
  medicine: Medicine;
  now: Date | null;
  supplierName: string;
  onAdjust: () => void;
}) {
  const stockValue = med.stock * med.purchasePrice;
  const isOut = med.stock === 0;
  const isLow = !isOut && med.stock <= med.minStock;

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      {/* Medicine Name and Rx */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 hover:text-emerald-600 transition-colors">
            {med.name}
          </span>
          {med.requiresPrescription && (
            <span className="text-[10px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded border border-violet-200">
              Rx
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{med.genericName}</p>
        <p className="text-[11px] text-slate-400">{med.brand}</p>
      </td>

      {/* Category */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
          {med.category}
        </span>
      </td>

      {/* Batch / Supplier */}
      <td className="px-4 py-3.5">
        <p className="font-mono text-xs text-slate-800 font-semibold">{med.batchNumber}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[170px]" title={supplierName}>
          {supplierName}
        </p>
      </td>

      {/* Stock Level */}
      <td className="px-4 py-3.5">
        <div className="min-w-[100px]">
          <div className="flex items-baseline gap-1">
            <span
              className={`font-black text-sm ${
                isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"
              }`}
            >
              {med.stock}
            </span>
            <span className="text-xs text-slate-400 font-normal">{med.unit}s</span>
          </div>
          <StockBar stock={med.stock} minStock={med.minStock} className="mt-1.5 w-20" />
          <p className="text-[10px] text-slate-400 mt-0.5">Min: {med.minStock}</p>
        </div>
      </td>

      {/* Valuation */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="font-bold text-slate-900 text-sm">{formatCurrency(stockValue)}</p>
        <p className="text-xs text-slate-400">
          {formatCurrency(med.purchasePrice)} / {med.unit.toLowerCase()}
        </p>
      </td>

      {/* Batch Expiry */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {now ? (
          <div>
            <ExpiryBadge expiryDate={med.expiryDate} now={now} />
            <p className="text-[11px] text-slate-400 mt-1">{formatDate(med.expiryDate)}</p>
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        {isOut ? (
          <Badge variant="danger">Out of Stock</Badge>
        ) : isLow ? (
          <Badge variant="warning">Low Stock</Badge>
        ) : now && isExpiredFn(med.expiryDate, now) ? (
          <Badge variant="danger">Expired</Badge>
        ) : now && isExpiringSoonFn(med.expiryDate, now) ? (
          <Badge variant="warning">Expiring</Badge>
        ) : (
          <Badge variant="success">Normal</Badge>
        )}
      </td>

      {/* Adjust CTA */}
      <td className="px-5 py-3.5 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onAdjust}
          className="gap-1.5 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border-slate-300 whitespace-nowrap"
        >
          <PackagePlus size={14} className="text-emerald-600" />
          Adjust
        </Button>
      </td>
    </tr>
  );
}

// ── Sortable Header Cell ───────────────────────────────────────────────────────
function SortTh({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-emerald-600 select-none transition-colors"
    >
      <span className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown size={12} className={active ? "text-emerald-600" : "text-slate-300"} />
        {active && <span className="text-[10px] text-emerald-600 font-bold">{dir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

// ── Date Helpers ──────────────────────────────────────────────────────────────
function isExpiredFn(expiryDate: string, now: Date) {
  return new Date(expiryDate) < now;
}

function isExpiringSoonFn(expiryDate: string, now: Date) {
  const diff = (new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 30 && diff >= 0;
}
