"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Award,
  DollarSign,
  Download,
  X,
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  ShoppingBag,
  Clock,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Customer } from "@/types";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { customerService } from "@/services/customerService";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

type FilterTier = "all" | "vip" | "frequent" | "new";
type SortOption = "recent" | "spending-desc" | "name-asc";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "CU";
}

export default function CustomersPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState<FilterTier>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await customerService.getAll({ limit: 500 });
      setCustomers(result.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ── Stats Calculation ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = customers.length;
    const totalRevenue = customers.reduce((acc, c) => acc + (Number(c.totalPurchases) || 0), 0);
    const vipCount = customers.filter((c) => (c.totalPurchases || 0) >= 10000).length;
    const avgSpend = total > 0 ? totalRevenue / total : 0;

    return { total, totalRevenue, vipCount, avgSpend };
  }, [customers]);

  // ── Filtering and Sorting ──────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => {
      const query = search.toLowerCase();
      const matchSearch =
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email ?? "").toLowerCase().includes(query) ||
        (c.address ?? "").toLowerCase().includes(query);

      if (!matchSearch) return false;

      const purchases = Number(c.totalPurchases) || 0;
      if (activeTier === "vip") return purchases >= 10000;
      if (activeTier === "frequent") return purchases > 0 && purchases < 10000;
      if (activeTier === "new") return purchases === 0;

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "spending-desc") {
        return (Number(b.totalPurchases) || 0) - (Number(a.totalPurchases) || 0);
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      // "recent"
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [customers, search, activeTier, sortBy]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTier, sortBy]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, currentPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email ?? "",
      address: c.address ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await customerService.update(editingId, form);
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        if (selectedCustomer?.id === editingId) {
          setSelectedCustomer(updated);
        }
        toastSuccess("Customer profile updated successfully");
      } else {
        const created = await customerService.create(form);
        setCustomers((prev) => [created, ...prev]);
        toastSuccess("New customer registered successfully");
      }
      setIsModalOpen(false);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    try {
      await customerService.delete(c.id);
      setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      if (selectedCustomer?.id === c.id) {
        setSelectedCustomer(null);
      }
      toastSuccess(`Deleted customer ${c.name}`);
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
    if (customers.length === 0) return;
    const headers = ["Name", "Phone", "Email", "Address", "Total Purchases", "Registered Date"];
    const rows = customers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${(c.email ?? "").replace(/"/g, '""')}"`,
      `"${(c.address ?? "").replace(/"/g, '""')}"`,
      c.totalPurchases ?? 0,
      `"${formatDate(c.createdAt)}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Customers & Patients" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Patient & Customer Directory</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Maintain customer profiles, prescription buyer histories, and patient credit balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={customers.length === 0}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Download size={15} />
              Export Directory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              disabled={loading}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-600/20"
            >
              <UserPlus size={16} />
              Add New Customer
            </Button>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Customers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Patients</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                Active directory
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>

          {/* Total Purchases / Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Purchases</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.totalRevenue)}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <TrendingUp size={13} />
                Accumulated volume
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>

          {/* VIP / High Value Clients */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">VIP Members</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.vipCount}</h3>
              <p className="text-xs text-violet-600 mt-1 font-medium flex items-center gap-1">
                <Sparkles size={13} />
                Spending &ge; Rs 10,000
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Award size={24} />
            </div>
          </div>

          {/* Average Spending */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Value / Patient</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(stats.avgSpend)}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <ShoppingBag size={13} className="text-amber-500" />
                Per registered patient
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Tier Pills, Sorting */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Tier Pills & Sort */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setActiveTier("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTier === "all" ? "bg-white text-slate-900 shadow-xs font-semibold" : "hover:text-slate-900"
                }`}
              >
                All ({customers.length})
              </button>
              <button
                onClick={() => setActiveTier("vip")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTier === "vip" ? "bg-white text-violet-700 shadow-xs font-semibold" : "hover:text-slate-900"
                }`}
              >
                VIP ({stats.vipCount})
              </button>
              <button
                onClick={() => setActiveTier("frequent")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTier === "frequent" ? "bg-white text-emerald-700 shadow-xs font-semibold" : "hover:text-slate-900"
                }`}
              >
                Frequent
              </button>
              <button
                onClick={() => setActiveTier("new")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTier === "new" ? "bg-white text-slate-900 shadow-xs font-semibold" : "hover:text-slate-900"
                }`}
              >
                New / Zero
              </button>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="spending-desc">Highest Purchases</option>
                <option value="name-asc">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-medium text-slate-600">Loading patient records...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 space-y-3">
            <p className="font-semibold text-rose-800">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchCustomers} className="mx-auto border-rose-300">
              <RefreshCw size={14} className="mr-2" /> Try Again
            </Button>
          </div>
        )}

        {/* Customer Directory Table */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Customer & Contact</th>
                    <th className="px-4 py-3.5">Phone Number</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Address</th>
                    <th className="px-4 py-3.5 text-right">Lifetime Purchases</th>
                    <th className="px-4 py-3.5">Member Tier</th>
                    <th className="px-4 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                        <Users size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                        <h4 className="text-base font-semibold text-slate-700">No Customers Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {search
                            ? `No customer matching "${search}". Try clearing your search filters.`
                            : "No customer records registered yet. Click 'Add New Customer' to get started."}
                        </p>
                        {search && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setActiveTier("all");
                            }}
                            className="mt-4"
                          >
                            Reset Search
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => {
                      const purchases = Number(c.totalPurchases) || 0;
                      const isVip = purchases >= 10000;
                      const isFrequent = purchases > 0 && purchases < 10000;
                      const avatarClass = getAvatarColor(c.name);

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          {/* Name & Avatar */}
                          <td className="px-5 py-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border ${avatarClass} shadow-xs flex-shrink-0`}
                              >
                                {getInitials(c.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 truncate hover:text-emerald-600 transition-colors">
                                    {c.name}
                                  </span>
                                  {isVip && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 font-mono">ID: {c.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-4 text-slate-700" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-800 font-medium">{c.phone}</span>
                              <button
                                onClick={() => copyToClipboard(c.phone, c.id)}
                                title="Copy Phone"
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                              >
                                {copiedId === c.id ? (
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                ) : (
                                  <Phone size={13} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-4 text-slate-500 text-xs" onClick={(e) => e.stopPropagation()}>
                            {c.email ? (
                              <a
                                href={`mailto:${c.email}`}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline max-w-[160px] truncate"
                              >
                                <Mail size={12} className="flex-shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Address */}
                          <td className="px-4 py-4 text-slate-500 text-xs max-w-[200px] truncate">
                            {c.address ? (
                              <span className="inline-flex items-center gap-1 text-slate-600" title={c.address}>
                                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                                <span className="truncate">{c.address}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Total Purchases */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-slate-900 text-sm">
                              {formatCurrency(purchases)}
                            </span>
                          </td>

                          {/* Member Tier */}
                          <td className="px-4 py-4">
                            {isVip ? (
                              <Badge variant="warning">
                                VIP Club
                              </Badge>
                            ) : isFrequent ? (
                              <Badge variant="success">
                                Regular
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                Standard
                              </Badge>
                            )}
                          </td>

                          {/* Registered Date */}
                          <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedCustomer(c)}
                                title="View Customer Details"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Customer"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(c)}
                                title="Delete Customer"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
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

            {/* Footer Summary & Pagination */}
            {filteredCustomers.length > 0 && filteredCustomers.length <= 10 && (
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredCustomers.length}</strong> of{" "}
                  <strong className="text-slate-700">{customers.length}</strong> patients
                </span>
                <span className="hidden sm:inline">Click any customer row to inspect quick profile</span>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="patients"
            />
          </div>
        )}
      </div>

      {/* Customer Profile View Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title="Customer Profile & History"
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border ${getAvatarColor(
                  selectedCustomer.name
                )} shadow-xs flex-shrink-0`}
              >
                {getInitials(selectedCustomer.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{selectedCustomer.name}</h3>
                  {Number(selectedCustomer.totalPurchases || 0) >= 10000 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient registered on {formatDate(selectedCustomer.createdAt)}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Lifetime Volume</p>
                <h4 className="text-xl font-black text-emerald-700 mt-1">
                  {formatCurrency(selectedCustomer.totalPurchases || 0)}
                </h4>
              </div>
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Customer Status</p>
                <h4 className="text-sm font-bold text-blue-700 mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Verified Patient
                </h4>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" /> Phone:
                </span>
                <span className="font-mono font-semibold text-slate-800">{selectedCustomer.phone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" /> Email:
                </span>
                <span className="text-slate-800">{selectedCustomer.email || "No email on record"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" /> Address:
                </span>
                <span className="text-slate-800 text-right max-w-[240px]">
                  {selectedCustomer.address || "No address provided"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  handleOpenEdit(target);
                }}
                className="gap-2"
              >
                <Pencil size={14} /> Edit Customer
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Customer Profile" : "Register New Customer"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Tariq Mehmood"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Phone Number *"
            placeholder="e.g. 0300-1234567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. customer@example.com (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            label="Residential / Shipping Address"
            placeholder="e.g. House #12, Street 4, Lahore"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : editingId ? (
                "Update Profile"
              ) : (
                "Save Customer"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Customer?</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-800">{deleteConfirm.name}</strong> from your customer directory?
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
