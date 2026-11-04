"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  PackagePlus,
  Pill,
  ArrowUpDown,
  Upload,
  Barcode,
  TrendingDown,
  Download,
  RefreshCw,
  Loader2,
  Filter,
  X,
  ShoppingCart,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Boxes,
  Layers,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import ExpiryBadge from "@/components/inventory/ExpiryBadge";
import StockBar from "@/components/inventory/StockBar";
import MedicineFormModal from "@/components/inventory/MedicineFormModal";
import StockAdjustModal from "@/components/inventory/StockAdjustModal";
import BarcodeLabelModal from "@/components/inventory/BarcodeLabelModal";
import BulkImportModal from "@/components/inventory/BulkImportModal";
import { usePharmacyStore } from "@/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useInventoryAlerts } from "@/hooks/useInventoryAlerts";
import { useReorderSuggestions, ReorderSuggestion } from "@/hooks/useReorderSuggestions";
import { Medicine, Supplier } from "@/types";
import { medicineService } from "@/services/medicineService";
import { supplierService } from "@/services/supplierService";
import { purchaseOrderService } from "@/services/purchaseOrderService";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { MEDICINE_CATEGORIES } from "@/lib/constants";

type CategoryFilter = Medicine["category"] | "All";
type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type ExpiryFilter = "all" | "expiring" | "expired";
type SortKey = "name" | "stock" | "price" | "expiry";
type SortDir = "asc" | "desc";
type ActiveTab = "catalogue" | "reorder";

interface FilterState {
  category: CategoryFilter;
  stockStatus: StockFilter;
  expiryStatus: ExpiryFilter;
  supplierId: string;
}

const DEFAULT_FILTERS: FilterState = {
  category: "All",
  stockStatus: "all",
  expiryStatus: "all",
  supplierId: "",
};

// ── Table Skeleton ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 animate-pulse">
          <td className="px-5 py-4">
            <div className="h-4 bg-slate-200 rounded w-40 mb-1.5" />
            <div className="h-3 bg-slate-100 rounded w-28" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 bg-slate-100 rounded-full w-20" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-slate-200 rounded w-16 mb-1.5" />
            <div className="h-2 bg-slate-100 rounded w-20" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-slate-200 rounded w-20 mb-1" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 bg-slate-100 rounded-full w-20" />
          </td>
          <td className="px-5 py-4 text-right">
            <div className="h-7 bg-slate-100 rounded w-24 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Book Now Modal ─────────────────────────────────────────────────────────────
interface BookNowModalProps {
  suggestion: ReorderSuggestion | null;
  suppliers: Supplier[];
  onClose: () => void;
  onBooked: () => void;
}

function BookNowModal({ suggestion, suppliers, onClose, onBooked }: BookNowModalProps) {
  const [qty, setQty] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (suggestion) {
      setQty(suggestion.suggestedQty);
      setUnitPrice(suggestion.medicine.purchasePrice);
      setSupplierId(suggestion.medicine.supplierId ?? "");
      setNotes("");
      setSuccess(false);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const total = qty * unitPrice;
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toastApiError(new Error("Please select a target supplier"));
      return;
    }
    if (qty <= 0) {
      toastApiError(new Error("Order quantity must be greater than zero"));
      return;
    }

    setSubmitting(true);
    try {
      await purchaseOrderService.create({
        supplierId,
        supplierName: selectedSupplier?.name ?? "",
        notes: notes || undefined,
        items: [
          {
            medicineId: suggestion.medicine.id,
            medicineName: suggestion.medicine.name,
            quantity: qty,
            unitPrice: unitPrice,
          },
        ],
      });
      setSuccess(true);
      toastSuccess(`Purchase order created for ${suggestion.medicine.name}`);
      setTimeout(() => {
        onBooked();
        onClose();
      }, 1200);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={!!suggestion} onClose={onClose} title="Replenishment Order" size="md">
      {success ? (
        <div className="py-8 text-center space-y-2">
          <CheckCircle size={48} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-lg font-bold text-slate-900">Purchase Order Placed!</p>
          <p className="text-xs text-slate-500">
            A purchase order has been generated and queued for dispatch.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medicine Card Overview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 text-base">{suggestion.medicine.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {suggestion.medicine.genericName} · {suggestion.medicine.brand}
                </p>
                <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                  {suggestion.reason}
                </p>
              </div>
              <Badge
                variant={
                  suggestion.priority === "Critical"
                    ? "danger"
                    : suggestion.priority === "High"
                    ? "warning"
                    : "info"
                }
              >
                {suggestion.priority} Priority
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mt-3.5 pt-3 border-t border-slate-200">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Stock</p>
                <p
                  className={`text-lg font-black mt-0.5 ${
                    suggestion.currentStock === 0 ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  {suggestion.currentStock}
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Min Threshold</p>
                <p className="text-lg font-black text-slate-700 mt-0.5">{suggestion.medicine.minStock}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200 text-center">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Suggested</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{suggestion.suggestedQty}</p>
              </div>
            </div>
          </div>

          {/* Supplier select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Supplier *
            </label>
            <div className="relative">
              <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
              >
                <option value="">— Choose Supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contactPerson})
                  </option>
                ))}
              </select>
            </div>
            {selectedSupplier && (
              <p className="text-xs text-slate-400 mt-1">
                Representative: {selectedSupplier.contactPerson} · Phone: {selectedSupplier.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Order Quantity
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Unit Purchase Price (PKR)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Order total */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Valuation</span>
            <span className="text-base font-black text-slate-900">{formatCurrency(total)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Order Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent restock, call before delivery"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : (
                <ShoppingCart size={15} className="mr-1.5" />
              )}
              {submitting ? "Placing Order..." : "Confirm & Create PO"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Filter Panel ───────────────────────────────────────────────────────────────
interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  suppliers: Supplier[];
  onChange: (f: FilterState) => void;
  onClose: () => void;
  onReset: () => void;
}

function FilterPanel({ open, filters, suppliers, onChange, onClose, onReset }: FilterPanelProps) {
  if (!open) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Filter size={15} className="text-emerald-600" /> Advanced Catalogue Filters
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Reset All
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-0.5">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Therapeutic Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value as CategoryFilter })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            {MEDICINE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stock status */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Stock Availability
          </label>
          <select
            value={filters.stockStatus}
            onChange={(e) => onChange({ ...filters, stockStatus: e.target.value as StockFilter })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Inventory</option>
            <option value="in-stock">In Stock (&gt; Min)</option>
            <option value="low-stock">Low Stock (At or Below Min)</option>
            <option value="out-of-stock">Out of Stock (Zero)</option>
          </select>
        </div>

        {/* Expiry status */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Expiry Timeline
          </label>
          <select
            value={filters.expiryStatus}
            onChange={(e) => onChange({ ...filters, expiryStatus: e.target.value as ExpiryFilter })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Batches</option>
            <option value="expiring">Expiring Soon (&le; 30 Days)</option>
            <option value="expired">Already Expired</option>
          </select>
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Sourced Supplier
          </label>
          <select
            value={filters.supplierId}
            onChange={(e) => onChange({ ...filters, supplierId: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Content ──────────────────────────────────────────────────────────
function MedicinesContent() {
  const { sales } = usePharmacyStore();
  const searchParams = useSearchParams();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState(() => searchParams?.get("search") ?? "");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalogue");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [adjustingMed, setAdjustingMed] = useState<Medicine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Medicine | null>(null);
  const [bookingSug, setBookingSug] = useState<ReorderSuggestion | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  // Sync search with URL param
  useEffect(() => {
    const q = searchParams?.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const fetchMedicines = useCallback(async () => {
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
      const msg = err instanceof Error ? err.message : "Failed to load medicine catalogue";
      setError(msg);
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const alerts = useInventoryAlerts(medicines, now);
  const reorderSuggestions = useReorderSuggestions(medicines, sales, now);

  const activeFilterCount = [
    filters.category !== "All",
    filters.stockStatus !== "all",
    filters.expiryStatus !== "all",
    filters.supplierId !== "",
  ].filter(Boolean).length;

  // Filter + Search
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filters.category !== "All" && m.category !== filters.category) return false;

      if (filters.supplierId && m.supplierId !== filters.supplierId) return false;

      const isOut = m.stock === 0;
      const isLow = !isOut && m.stock <= m.minStock;
      if (filters.stockStatus === "out-of-stock" && !isOut) return false;
      if (filters.stockStatus === "low-stock" && !isLow) return false;
      if (filters.stockStatus === "in-stock" && (isOut || isLow)) return false;

      if (now) {
        const daysToExpiry = (new Date(m.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const isExpired = daysToExpiry < 0;
        const isExpiring = daysToExpiry >= 0 && daysToExpiry <= 30;
        if (filters.expiryStatus === "expired" && !isExpired) return false;
        if (filters.expiryStatus === "expiring" && !isExpiring) return false;
      }

      return true;
    });
  }, [medicines, search, filters, now]);

  const sortedMedicines = useMemo(() => {
    return [...filteredMedicines].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "stock") cmp = a.stock - b.stock;
      else if (sortKey === "price") cmp = a.sellingPrice - b.sellingPrice;
      else if (sortKey === "expiry") cmp = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredMedicines, sortKey, sortDir]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filters, sortKey, sortDir]);

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

  const handleAdd = () => {
    setEditingMed(null);
    setFormOpen(true);
  };

  const handleEdit = (m: Medicine) => {
    setEditingMed(m);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Omit<Medicine, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (editingMed) {
        const updated = await medicineService.update(editingMed.id, data);
        setMedicines((prev) => prev.map((m) => (m.id === editingMed.id ? updated : m)));
        toastSuccess("Medicine details updated");
      } else {
        const created = await medicineService.create(data);
        setMedicines((prev) => [created, ...prev]);
        toastSuccess("New medicine added to catalogue");
      }
      setFormOpen(false);
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleDelete = async (med: Medicine) => {
    try {
      await medicineService.delete(med.id);
      setMedicines((prev) => prev.filter((m) => m.id !== med.id));
      toastSuccess(`Deleted medicine ${med.name}`);
      setDeleteConfirm(null);
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleAdjust = async (medicineId: string, adjustment: number) => {
    try {
      const updated = await medicineService.adjustStock(medicineId, adjustment);
      setMedicines((prev) => prev.map((m) => (m.id === medicineId ? updated : m)));
      toastSuccess("Stock count adjusted");
      setAdjustingMed(null);
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleBulkImport = async (imported: Omit<Medicine, "id" | "createdAt" | "updatedAt">[]) => {
    try {
      const results = await Promise.all(imported.map((m) => medicineService.create(m)));
      setMedicines((prev) => [...results, ...prev]);
      toastSuccess(`${imported.length} medicines imported successfully`);
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "name",
      "genericName",
      "brand",
      "category",
      "unit",
      "batchNumber",
      "expiryDate",
      "purchasePrice",
      "sellingPrice",
      "stock",
      "minStock",
      "requiresPrescription",
    ];
    const rows = medicines.map((m) =>
      headers
        .map((h) => {
          const val = (m as unknown as Record<string, unknown>)[h];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val ?? "");
        })
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medicines_inventory_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess(`${medicines.length} medicines exported to CSV`);
  };

  // ── Error View ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <Header title="Medicines" />
        <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-rose-600 font-semibold">{error}</p>
          <Button onClick={fetchMedicines} variant="outline" className="border-rose-300">
            <RefreshCw size={14} className="mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Medicines & Pharmaceutical Inventory" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Pill size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Drug Directory & Pharmacy Stock</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Maintain active formulations, monitor batch expirations, adjust on-hand units, and restock low inventory.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMedicines}
              disabled={loading}
              title="Refresh Catalogue"
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBarcodeModal(true)}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Barcode size={15} />
              Barcodes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Download size={15} />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Upload size={15} />
              Import
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-600/20"
            >
              <Plus size={16} />
              Add Medicine
            </Button>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Medicines */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalogue Items</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{medicines.length}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Boxes size={13} className="text-emerald-500" />
                Active formulations
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Pill size={24} />
            </div>
          </div>

          {/* Out of Stock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Out of Stock</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{alerts.outOfStock.length}</h3>
              <p
                className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  alerts.outOfStock.length > 0 ? "text-rose-600 font-semibold" : "text-slate-500"
                }`}
              >
                <ShieldAlert size={13} />
                {alerts.outOfStock.length > 0 ? "Urgent restocking needed" : "Zero depleted items"}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                alerts.outOfStock.length > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
              }`}
            >
              <PackagePlus size={24} />
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{alerts.lowStock.length}</h3>
              <p
                className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  alerts.lowStock.length > 0 ? "text-amber-600 font-semibold" : "text-slate-500"
                }`}
              >
                <AlertTriangle size={13} />
                At or below min threshold
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                alerts.lowStock.length > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"
              }`}
            >
              <AlertTriangle size={24} />
            </div>
          </div>

          {/* Expiry Issues */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiry Risks</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {alerts.expired.length + alerts.expiringSoon.length}
              </h3>
              <p
                className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  alerts.expired.length > 0
                    ? "text-rose-600 font-semibold"
                    : alerts.expiringSoon.length > 0
                    ? "text-orange-600 font-semibold"
                    : "text-slate-500"
                }`}
              >
                <Clock size={13} />
                {alerts.expired.length} expired · {alerts.expiringSoon.length} within 30d
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                alerts.expired.length + alerts.expiringSoon.length > 0
                  ? "bg-orange-50 text-orange-600"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Filters toggle, and View Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by brand, generic name, formula or batch..."
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

            <button
              onClick={() => setShowFilterPanel((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all whitespace-nowrap ${
                showFilterPanel || activeFilterCount > 0
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Filter size={14} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-emerald-700 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Segmented Controller: Catalogue vs Reorder */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab("catalogue")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "catalogue"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              <Layers size={14} className={activeTab === "catalogue" ? "text-emerald-600" : "text-slate-400"} />
              Catalogue ({medicines.length})
            </button>
            <button
              onClick={() => setActiveTab("reorder")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "reorder"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              <TrendingDown size={14} className={activeTab === "reorder" ? "text-blue-600" : "text-slate-400"} />
              Reorder Suggestions
              {reorderSuggestions.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {reorderSuggestions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <FilterPanel
          open={showFilterPanel}
          filters={filters}
          suppliers={suppliers}
          onChange={setFilters}
          onClose={() => setShowFilterPanel(false)}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        {/* ── Tab 1: Catalogue Table ── */}
        {activeTab === "catalogue" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <SortTh label="Medicine Formulation" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Batch / Expiry</th>
                    <SortTh label="Stock Level" sortKey="stock" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortTh label="Price & Margin" sortKey="price" current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <TableSkeleton />
                  ) : sortedMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        <Pill size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                        <h4 className="text-base font-semibold text-slate-700">No Medicines Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {search || activeFilterCount > 0
                            ? "No products match your search or filter configuration. Try resetting filters."
                            : "No medicines registered yet. Click 'Add Medicine' to begin building your inventory."}
                        </p>
                        {(search || activeFilterCount > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setFilters(DEFAULT_FILTERS);
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
                      <MedicineRow
                        key={med.id}
                        medicine={med}
                        now={now}
                        onEdit={handleEdit}
                        onDelete={setDeleteConfirm}
                        onAdjust={setAdjustingMed}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && sortedMedicines.length > 0 && sortedMedicines.length <= 10 && (
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{sortedMedicines.length}</strong> of{" "}
                  <strong className="text-slate-700">{medicines.length}</strong> formulations
                  {activeFilterCount > 0 && <span className="text-emerald-600 font-semibold ml-1">(filtered)</span>}
                </span>
                <span className="hidden sm:inline">Use inline actions to adjust stock, modify details, or remove records</span>
              </div>
            )}

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedMedicines.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="formulations"
              />
            )}
          </div>
        )}

        {/* ── Tab 2: Reorder Suggestions ── */}
        {activeTab === "reorder" && (
          <div className="space-y-4">
            {reorderSuggestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
                <CheckCircle size={44} className="mx-auto mb-3 text-emerald-500" strokeWidth={1.5} />
                <h4 className="text-base font-bold text-slate-900">All Inventory Sufficient</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Every medicine is stocked above its minimum required threshold with zero critical runout warnings.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reorderSuggestions.map((sug) => {
                  const isCritical = sug.priority === "Critical";
                  const isHigh = sug.priority === "High";

                  return (
                    <div
                      key={sug.medicine.id}
                      className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                        isCritical
                          ? "border-rose-200 bg-rose-50/20"
                          : isHigh
                          ? "border-amber-200 bg-amber-50/20"
                          : "border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-base truncate">{sug.medicine.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {sug.medicine.genericName} · {sug.medicine.brand}
                            </p>
                          </div>
                          <Badge
                            variant={isCritical ? "danger" : isHigh ? "warning" : "info"}
                          >
                            {sug.priority} Priority
                          </Badge>
                        </div>

                        <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
                          <AlertTriangle
                            size={14}
                            className={`flex-shrink-0 mt-0.5 ${
                              isCritical ? "text-rose-500" : isHigh ? "text-amber-500" : "text-blue-500"
                            }`}
                          />
                          <span>{sug.reason}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5 mt-3 text-center">
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Current Stock
                            </span>
                            <span
                              className={`text-base font-black ${
                                sug.currentStock === 0 ? "text-rose-600" : "text-amber-600"
                              }`}
                            >
                              {sug.currentStock}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Min Required
                            </span>
                            <span className="text-base font-black text-slate-700">{sug.medicine.minStock}</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-emerald-200">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                              Suggested Order
                            </span>
                            <span className="text-base font-black text-emerald-700">{sug.suggestedQty}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          {sug.avgDailySales !== undefined && sug.avgDailySales > 0
                            ? `Sales velocity: ~${sug.avgDailySales.toFixed(1)} / day`
                            : "Standard replenishment"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setBookingSug(sug)}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <ShoppingCart size={13} />
                          Book Purchase Order
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <MedicineFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        medicine={editingMed}
        suppliers={suppliers}
      />

      <StockAdjustModal
        medicine={adjustingMed}
        isOpen={!!adjustingMed}
        onClose={() => setAdjustingMed(null)}
        onAdjust={handleAdjust}
      />

      <BookNowModal
        suggestion={bookingSug}
        suppliers={suppliers}
        onClose={() => setBookingSug(null)}
        onBooked={fetchMedicines}
      />

      <BarcodeLabelModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        medicines={medicines}
      />

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Medicine?</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">{deleteConfirm.name}</strong> from your active catalogue?
              This will remove all associated stock metrics.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-300"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Medicine Row Component ─────────────────────────────────────────────────────
function MedicineRow({
  medicine: med,
  now,
  onEdit,
  onDelete,
  onAdjust,
}: {
  medicine: Medicine;
  now: Date | null;
  onEdit: (m: Medicine) => void;
  onDelete: (m: Medicine) => void;
  onAdjust: (m: Medicine) => void;
}) {
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
        <p className="text-[11px] text-slate-400 mt-0.5">{med.unit}</p>
      </td>

      {/* Batch / Expiry */}
      <td className="px-4 py-3.5">
        <p className="font-mono text-xs text-slate-800 font-semibold">{med.batchNumber}</p>
        {now && (
          <div className="mt-1 flex items-center gap-1.5">
            <ExpiryBadge expiryDate={med.expiryDate} now={now} />
            <span className="text-[11px] text-slate-400">{formatDate(med.expiryDate)}</span>
          </div>
        )}
      </td>

      {/* Stock Level */}
      <td className="px-4 py-3.5">
        <div className="min-w-[100px]">
          <span
            className={`font-black text-sm ${
              isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {med.stock}
            <span className="text-xs font-normal text-slate-400 ml-1">{med.unit}s</span>
          </span>
          <StockBar stock={med.stock} minStock={med.minStock} className="mt-1.5 w-20" />
          <p className="text-[10px] text-slate-400 mt-0.5">Min required: {med.minStock}</p>
        </div>
      </td>

      {/* Price & Cost */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <p className="font-bold text-slate-900">{formatCurrency(med.sellingPrice)}</p>
        <p className="text-xs text-slate-400">Cost: {formatCurrency(med.purchasePrice)}</p>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        {isOut ? (
          <Badge variant="danger">Out of Stock</Badge>
        ) : isLow ? (
          <Badge variant="warning">Low Stock</Badge>
        ) : (
          <Badge variant="success">In Stock</Badge>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAdjust(med)}
            title="Adjust On-Hand Stock"
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <PackagePlus size={15} />
          </button>
          <button
            onClick={() => onEdit(med)}
            title="Edit Medicine"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(med)}
            title="Delete Medicine"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
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

// ── Suspense Wrapper (required by Next.js useSearchParams) ─────────────────────
export default function MedicinesPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="Medicines" />
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <MedicinesContent />
    </Suspense>
  );
}
