"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  ClipboardList,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  PackageCheck,
  Loader2,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  ArrowUpDown,
  Download,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  Boxes,
  Check,
  FileText,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { PurchaseOrder, PurchaseOrderItem, POStatus, Supplier, Medicine } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { purchaseOrderService } from "@/services/purchaseOrderService";
import { supplierService } from "@/services/supplierService";
import { medicineService } from "@/services/medicineService";

const STATUS_VARIANT: Record<POStatus, "success" | "warning" | "danger" | "info" | "default"> = {
  Draft: "default",
  Sent: "info",
  Confirmed: "warning",
  PartiallyReceived: "warning",
  Received: "success",
  Cancelled: "danger",
};

const EMPTY_ITEM = {
  medicineId: "",
  medicineName: "",
  quantity: 1,
  unitPrice: 0,
};

type SortOption = "date-desc" | "value-desc" | "po-asc";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function getSupplierAvatar(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PurchaseOrdersPage() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus | "All">("All");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);
  const [receiveItems, setReceiveItems] = useState<(PurchaseOrderItem & { id: string })[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [poForm, setPOForm] = useState({
    supplierId: "",
    expectedDeliveryDate: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  });

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [poResult, supResult, medResult] = await Promise.all([
        purchaseOrderService.getAll({ limit: 500 }),
        supplierService.getAll(),
        medicineService.getAll({ limit: 1000 }),
      ]);
      setOrders(poResult.orders);
      setSuppliers(supResult);
      setMedicines(medResult.medicines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load procurement records");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Totals Calculation ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalVolume = orders.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const inTransit = orders.filter((p) => ["Sent", "Confirmed", "PartiallyReceived"].includes(p.status)).length;
    const received = orders.filter((p) => p.status === "Received").length;
    const drafts = orders.filter((p) => p.status === "Draft").length;

    return {
      totalVolume,
      inTransit,
      received,
      drafts,
      totalCount: orders.length,
    };
  }, [orders]);

  // ── Filtered and Sorted PO list ────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    const result = orders.filter((po) => {
      const matchSearch =
        po.poNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        (po.notes ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || po.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "value-desc") {
        return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
      }
      if (sortBy === "po-asc") {
        return a.poNumber.localeCompare(b.poNumber);
      }
      // "date-desc"
      return new Date(b.poDate || b.createdAt).getTime() - new Date(a.poDate || a.createdAt).getTime();
    });
  }, [orders, search, statusFilter, sortBy]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // ── PO Form item helpers ───────────────────────────────────────────────────
  const updateItem = (idx: number, field: string, value: string | number) => {
    setPOForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[idx], [field]: value };
      if (field === "medicineId") {
        const med = medicines.find((m) => m.id === value);
        if (med) {
          item.medicineName = med.name;
          item.unitPrice = med.purchasePrice;
        }
      }
      items[idx] = item;
      return { ...prev, items };
    });
  };

  const addItem = () =>
    setPOForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));

  const removeItem = (idx: number) =>
    setPOForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreatePO = async () => {
    if (!poForm.supplierId) {
      toastApiError(new Error("Please select a supplier for this order"));
      return;
    }
    if (poForm.items.some((i) => !i.medicineId || i.quantity <= 0)) {
      toastApiError(new Error("Please select valid medicines and positive quantities"));
      return;
    }
    const supplier = suppliers.find((s) => s.id === poForm.supplierId);
    setSubmitting(true);
    try {
      const created = await purchaseOrderService.create({
        supplierId: poForm.supplierId,
        supplierName: supplier?.name ?? "",
        expectedDeliveryDate: poForm.expectedDeliveryDate || undefined,
        notes: poForm.notes || undefined,
        items: poForm.items,
      });
      setOrders((prev) => [created, ...prev]);
      toastSuccess(`Purchase order ${created.poNumber} created successfully`);
      setShowForm(false);
      setPOForm({
        supplierId: "",
        expectedDeliveryDate: "",
        notes: "",
        items: [{ ...EMPTY_ITEM }],
      });
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (po: PurchaseOrder, status: POStatus) => {
    try {
      const updated = await purchaseOrderService.updateStatus(po.id, status);
      setOrders((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
      if (viewPO?.id === po.id) setViewPO(updated);
      toastSuccess(`Order status updated to ${status}`);
    } catch (err) {
      toastApiError(err);
    }
  };

  const openReceive = (po: PurchaseOrder) => {
    setReceivePO(po);
    setReceiveItems(
      (po.items as (PurchaseOrderItem & { id: string })[]).map((i) => ({
        ...i,
        batchNumber: "",
        expiryDate: "",
        receivedQuantity: i.quantity,
      }))
    );
  };

  const handleReceive = async () => {
    if (!receivePO) return;
    if (receiveItems.some((i) => !i.batchNumber?.trim() || !i.expiryDate)) {
      toastApiError(new Error("Please provide a batch number and expiry date for each received item"));
      return;
    }
    setSubmitting(true);
    try {
      const updated = await purchaseOrderService.receiveGoods(
        receivePO.id,
        receiveItems.map((i) => ({
          id: i.id,
          receivedQuantity: i.receivedQuantity,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
        }))
      );
      setOrders((prev) => prev.map((p) => (p.id === receivePO.id ? updated : p)));
      if (viewPO?.id === receivePO.id) setViewPO(updated);
      toastSuccess("Goods received! Inventory stock and batches updated successfully");
      setReceivePO(null);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (po: PurchaseOrder) => {
    try {
      await purchaseOrderService.delete(po.id);
      setOrders((prev) => prev.filter((p) => p.id !== po.id));
      if (viewPO?.id === po.id) setViewPO(null);
      toastSuccess(`Deleted order ${po.poNumber}`);
      setDeleteConfirm(null);
    } catch (err) {
      toastApiError(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["PO Number", "Supplier", "Items Count", "Total Amount (PKR)", "PO Date", "Expected Delivery", "Status"];
    const rows = orders.map((po) => [
      `"${po.poNumber}"`,
      `"${po.supplierName.replace(/"/g, '""')}"`,
      po.items.length,
      po.totalAmount,
      `"${formatDate(po.poDate)}"`,
      `"${po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : "—"}"`,
      `"${po.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusTabs: (POStatus | "All")[] = ["All", "Draft", "Sent", "Confirmed", "Received", "Cancelled"];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Purchase Orders & Procurement" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileSpreadsheet size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Procurement & Purchase Orders</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Issue replenishment orders to pharma suppliers, track shipments, and register Goods Received Notes (GRN).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={orders.length === 0}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Download size={15} />
              Export CSV
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
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm shadow-indigo-600/20"
            >
              <Plus size={16} />
              New Purchase Order
            </Button>
          </div>
        </div>

        {/* Executive KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Procurement Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Procurement</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalVolume)}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Boxes size={13} className="text-indigo-500" />
                Across {stats.totalCount} total POs
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>

          {/* In Transit / Pending Orders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-Transit / Pending</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.inTransit}</h3>
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 font-medium">
                <Truck size={13} />
                Awaiting delivery & GRN
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck size={24} />
            </div>
          </div>

          {/* Received & Stocked */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed / Received</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.received}</h3>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 size={13} />
                Stock added to inventory
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Drafts Awaiting Confirmation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Draft POs</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.drafts}</h3>
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
                <Clock size={13} />
                Requires supplier dispatch
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardList size={24} />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Status Tabs, Sort */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO number or supplier name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
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

          {/* Status Tabs and Sort */}
          <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600 flex-wrap">
              {statusTabs.map((s) => {
                const count = s === "All" ? orders.length : orders.filter((o) => o.status === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      statusFilter === s
                        ? "bg-white text-slate-900 shadow-xs font-semibold"
                        : "hover:text-slate-900 text-slate-600"
                    }`}
                  >
                    <span>{s}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        statusFilter === s ? "bg-slate-100 text-slate-800" : "bg-slate-200/60 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Newest Orders</option>
                <option value="value-desc">Highest Amount</option>
                <option value="po-asc">PO Number (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-medium text-slate-600">Loading procurement orders & stock data...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 space-y-3">
            <p className="font-semibold text-rose-800">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAll} className="mx-auto border-rose-300">
              <RefreshCw size={14} className="mr-2" /> Try Again
            </Button>
          </div>
        )}

        {/* Purchase Orders Table */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3.5">PO Number</th>
                    <th className="px-4 py-3.5">Supplier / Vendor</th>
                    <th className="px-4 py-3.5">Items Summary</th>
                    <th className="px-4 py-3.5 text-right">Total Amount</th>
                    <th className="px-4 py-3.5">Order Date</th>
                    <th className="px-4 py-3.5">Expected Delivery</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                        <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                        <h4 className="text-base font-semibold text-slate-700">No Purchase Orders Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {search || statusFilter !== "All"
                            ? "No purchase orders match your filter criteria. Try resetting filters."
                            : "No purchase orders generated yet. Click 'New Purchase Order' to begin procurement."}
                        </p>
                        {(search || statusFilter !== "All") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("All");
                            }}
                            className="mt-4"
                          >
                            Reset Filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((po) => {
                      const avatarClass = getSupplierAvatar(po.supplierName);
                      const isOverdue =
                        po.expectedDeliveryDate &&
                        new Date(po.expectedDeliveryDate).getTime() < Date.now() &&
                        !["Received", "Cancelled"].includes(po.status);

                      return (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setViewPO(po)}
                        >
                          {/* PO Number */}
                          <td className="px-5 py-4 font-medium text-slate-900" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => setViewPO(po)}
                                className="font-mono text-xs font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {po.poNumber}
                              </span>
                              <button
                                onClick={() => copyToClipboard(po.poNumber, po.id)}
                                title="Copy PO Number"
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                              >
                                {copiedId === po.id ? (
                                  <Check size={13} className="text-emerald-500" />
                                ) : (
                                  <FileText size={13} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-4 text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${avatarClass} shadow-xs flex-shrink-0`}
                              >
                                {po.supplierName.slice(0, 2).toUpperCase() || "SP"}
                              </div>
                              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                {po.supplierName}
                              </span>
                            </div>
                          </td>

                          {/* Items summary */}
                          <td className="px-4 py-4 text-slate-600">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                              <Boxes size={12} className="text-slate-400" />
                              {po.items.length} {po.items.length === 1 ? "medicine" : "medicines"}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-black text-slate-900 text-sm">
                              {formatCurrency(po.totalAmount)}
                            </span>
                          </td>

                          {/* PO Date */}
                          <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span>{formatDate(po.poDate)}</span>
                            </div>
                          </td>

                          {/* Expected Delivery */}
                          <td className="px-4 py-4 text-xs whitespace-nowrap">
                            {po.expectedDeliveryDate ? (
                              <div
                                className={`flex items-center gap-1 font-medium ${
                                  isOverdue ? "text-rose-600" : "text-slate-600"
                                }`}
                              >
                                <Clock size={12} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                                <span>{formatDate(po.expectedDeliveryDate)}</span>
                                {isOverdue && (
                                  <span className="ml-1 px-1 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <Badge variant={STATUS_VARIANT[po.status]}>{po.status}</Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Receive Goods CTA for in-transit */}
                              {(po.status === "Confirmed" || po.status === "Sent") && (
                                <button
                                  onClick={() => openReceive(po)}
                                  title="Receive Goods (GRN)"
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors"
                                >
                                  <PackageCheck size={13} />
                                  <span>Receive</span>
                                </button>
                              )}

                              {/* Send CTA for Draft */}
                              {po.status === "Draft" && (
                                <button
                                  onClick={() => handleStatusUpdate(po, "Sent")}
                                  title="Mark as Sent to Supplier"
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                                >
                                  <Send size={12} />
                                  <span>Send</span>
                                </button>
                              )}

                              {/* View Modal */}
                              <button
                                onClick={() => setViewPO(po)}
                                title="View Purchase Order Details"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Delete Draft */}
                              {po.status === "Draft" && (
                                <button
                                  onClick={() => setDeleteConfirm(po)}
                                  title="Delete Draft PO"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}

                              {/* Cancel PO */}
                              {!["Received", "Cancelled"].includes(po.status) && (
                                <button
                                  onClick={() => handleStatusUpdate(po, "Cancelled")}
                                  title="Cancel PO"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <XCircle size={15} />
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

            {/* Footer Summary & Pagination */}
            {filteredOrders.length > 0 && filteredOrders.length <= 10 && (
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredOrders.length}</strong> of{" "}
                  <strong className="text-slate-700">{orders.length}</strong> procurement orders
                </span>
                <span className="hidden sm:inline">Click any purchase order row to inspect full line items & GRN history</span>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredOrders.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="procurement orders"
            />
          </div>
        )}
      </div>

      {/* ── Create Purchase Order Modal ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create New Purchase Order"
        size="xl"
      >
        <div className="space-y-6">
          {/* Supplier and Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Supplier *
              </label>
              <select
                value={poForm.supplierId}
                onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">— Select Pharma Supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={poForm.expectedDeliveryDate}
                onChange={(e) => setPOForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Special Procurement Notes / Instructions
              </label>
              <input
                type="text"
                placeholder="e.g. Urgent cold chain delivery, invoice copy requested"
                value={poForm.notes}
                onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Procurement Items</h4>
                <p className="text-xs text-slate-500">Add medicines and define quantities to purchase</p>
              </div>
              <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5 text-xs">
                <Plus size={14} /> Add Medicine
              </Button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="px-3.5 py-2.5 text-left">Medicine</th>
                    <th className="px-3.5 py-2.5 text-center w-28">Order Qty</th>
                    <th className="px-3.5 py-2.5 text-right w-36">Unit Price (PKR)</th>
                    <th className="px-3.5 py-2.5 text-right w-36">Line Total</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poForm.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {/* Medicine Selector */}
                      <td className="px-3 py-2.5">
                        <select
                          value={item.medicineId}
                          onChange={(e) => updateItem(idx, "medicineId", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">— Select medicine —</option>
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.strength || "Standard"}) — Current Stock: {m.stock}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>

                      {/* Line Total */}
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>

                      {/* Remove Button */}
                      <td className="px-2 py-2.5 text-center">
                        {poForm.items.length > 1 && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer Banner */}
            <div className="flex items-center justify-between mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Order Calculation
              </span>
              <div className="text-right">
                <span className="text-xs text-slate-400 mr-2">Estimated Payable:</span>
                <span className="text-lg font-black text-slate-900">
                  {formatCurrency(poForm.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleCreatePO}
              disabled={submitting}
            >
              {submitting ? <Loader2 size={15} className="animate-spin mr-2" /> : <Plus size={16} className="mr-1.5" />}
              Generate Purchase Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── View Purchase Order Details Modal ── */}
      {viewPO && (
        <Modal
          isOpen={!!viewPO}
          onClose={() => setViewPO(null)}
          title={`Purchase Order: ${viewPO.poNumber}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Executive Overview Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm border ${getSupplierAvatar(
                    viewPO.supplierName
                  )}`}
                >
                  {viewPO.supplierName.slice(0, 2).toUpperCase() || "SP"}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{viewPO.supplierName}</h3>
                  <p className="text-xs text-slate-500">Ordered on {formatDate(viewPO.poDate)}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[viewPO.status]}>{viewPO.status}</Badge>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Expected Delivery Date</span>
                <span className="font-semibold text-slate-800">
                  {viewPO.expectedDeliveryDate ? formatDate(viewPO.expectedDeliveryDate) : "Not Specified"}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-0.5">Total Valuation</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(viewPO.totalAmount)}</span>
              </div>
              {viewPO.notes && (
                <div className="col-span-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-slate-700">
                  <span className="text-amber-800 font-semibold block mb-0.5">Procurement Notes:</span>
                  <span>{viewPO.notes}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Order Line Items
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="px-3.5 py-2.5 text-left">Medicine</th>
                      <th className="px-3.5 py-2.5 text-center">Ordered</th>
                      <th className="px-3.5 py-2.5 text-center">Received</th>
                      <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                      <th className="px-3.5 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewPO.items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2.5 font-medium text-slate-900">{item.medicineName}</td>
                        <td className="px-3.5 py-2.5 text-center font-medium text-slate-700">{item.quantity}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              item.receivedQuantity >= item.quantity
                                ? "bg-emerald-100 text-emerald-800"
                                : item.receivedQuantity > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.receivedQuantity}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                {(viewPO.status === "Confirmed" || viewPO.status === "Sent") && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = viewPO;
                      setViewPO(null);
                      openReceive(target);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <PackageCheck size={14} /> Receive Goods
                  </Button>
                )}
                {viewPO.status === "Draft" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(viewPO, "Sent")}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  >
                    <Send size={14} /> Send Order
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setViewPO(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Receive Goods Modal (GRN - Goods Received Note) ── */}
      {receivePO && (
        <Modal
          isOpen={!!receivePO}
          onClose={() => setReceivePO(null)}
          title={`Receive Goods — ${receivePO.poNumber}`}
          size="xl"
        >
          <div className="space-y-5">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <PackageCheck size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Inventory Receiving & Batch Registration</p>
                <p className="text-emerald-700 mt-0.5">
                  Enter the manufacturer batch numbers and expiry dates. Submitting will directly replenish
                  warehouse inventory and activate stock for sales.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="px-3.5 py-2.5 text-left">Medicine</th>
                    <th className="px-3.5 py-2.5 text-center w-24">Ordered</th>
                    <th className="px-3.5 py-2.5 text-center w-28">Received Qty</th>
                    <th className="px-3.5 py-2.5 text-left w-36">Batch Number *</th>
                    <th className="px-3.5 py-2.5 text-left w-40">Expiry Date *</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiveItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-3 font-semibold text-slate-900">{item.medicineName}</td>
                      <td className="px-3.5 py-3 text-center text-slate-500 font-mono">{item.quantity}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={item.receivedQuantity}
                          onChange={(e) =>
                            setReceiveItems((prev) =>
                              prev.map((i, n) =>
                                n === idx ? { ...i, receivedQuantity: Number(e.target.value) } : i
                              )
                            )
                          }
                          className="w-full text-center rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.batchNumber ?? ""}
                          placeholder="e.g. BN-2026-A1"
                          onChange={(e) =>
                            setReceiveItems((prev) =>
                              prev.map((i, n) => (n === idx ? { ...i, batchNumber: e.target.value } : i))
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={item.expiryDate ?? ""}
                          onChange={(e) =>
                            setReceiveItems((prev) =>
                              prev.map((i, n) => (n === idx ? { ...i, expiryDate: e.target.value } : i))
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setReceivePO(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleReceive}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin mr-2" />
                ) : (
                  <PackageCheck size={16} className="mr-1.5" />
                )}
                Confirm Receipt & Update Stock
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Purchase Order?</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to permanently delete purchase order{" "}
              <strong className="text-slate-800">{deleteConfirm.poNumber}</strong>?
              This action cannot be undone.
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
