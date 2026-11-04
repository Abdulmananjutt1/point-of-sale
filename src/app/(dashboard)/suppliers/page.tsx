"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building2,
  UserCheck,
  CheckCircle2,
  Download,
  X,
  Eye,
  Clock,
  ArrowUpDown,
  ShieldCheck,
  FileText,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import { Supplier } from "@/types";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { supplierService, SupplierPayload } from "@/services/supplierService";

const EMPTY_FORM: SupplierPayload = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
};

type SortOption = "name-asc" | "recent" | "contact-asc";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
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
  return name.slice(0, 2).toUpperCase() || "SP";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supplierService.getAll({ limit: 500 });
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Stats Calculation ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = suppliers.length;
    const withEmail = suppliers.filter((s) => !!s.email).length;
    const withContactPerson = suppliers.filter((s) => !!s.contactPerson?.trim()).length;
    const withAddress = suppliers.filter((s) => !!s.address?.trim()).length;

    return { total, withEmail, withContactPerson, withAddress };
  }, [suppliers]);

  // ── Filtering and Sorting ──────────────────────────────────────────────────
  const filteredSuppliers = useMemo(() => {
    const query = search.toLowerCase();
    const result = suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.contactPerson.toLowerCase().includes(query) ||
        s.phone.includes(query) ||
        (s.email ?? "").toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query)
      );
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "contact-asc") {
        return a.contactPerson.localeCompare(b.contactPerson);
      }
      // "recent"
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [suppliers, search, sortBy]);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, currentPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email ?? "",
      address: s.address,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contactPerson.trim() || !form.phone.trim() || !form.address.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await supplierService.update(editingId, form);
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        if (selectedSupplier?.id === editingId) {
          setSelectedSupplier(updated);
        }
        toastSuccess("Supplier information updated");
      } else {
        const created = await supplierService.create(form);
        setSuppliers((prev) => [created, ...prev]);
        toastSuccess("New supplier registered");
      }
      setIsModalOpen(false);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    try {
      await supplierService.delete(s.id);
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
      if (selectedSupplier?.id === s.id) {
        setSelectedSupplier(null);
      }
      toastSuccess(`Deleted supplier ${s.name}`);
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
    if (suppliers.length === 0) return;
    const headers = ["Company Name", "Contact Person", "Phone", "Email", "Address", "Registered Date"];
    const rows = suppliers.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.contactPerson.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${(s.email ?? "").replace(/"/g, '""')}"`,
      `"${s.address.replace(/"/g, '""')}"`,
      `"${formatDate(s.createdAt)}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suppliers_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Suppliers & Distributors" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Truck size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Suppliers & Pharma Distributors</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Maintain medicine vendors, distribution contracts, point-of-contact details, and supply channels.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={suppliers.length === 0}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <Download size={15} />
              Export Directory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSuppliers}
              disabled={loading}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-600/20"
            >
              <Plus size={16} />
              Add New Supplier
            </Button>
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Suppliers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Vendors</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck size={13} className="text-blue-500" />
                Registered partners
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={24} />
            </div>
          </div>

          {/* Contact Person Coverage */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Representatives</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.withContactPerson}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <UserCheck size={13} />
                Assigned agents
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck size={24} />
            </div>
          </div>

          {/* Email Reach */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Digital / Email Reach</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.withEmail}</h3>
              <p className="text-xs text-indigo-600 mt-1 font-medium flex items-center gap-1">
                <Mail size={13} />
                Verified email routing
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail size={24} />
            </div>
          </div>

          {/* Logistics Coverage */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physical Depots</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.withAddress}</h3>
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
                <MapPin size={13} />
                Warehouse addresses
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck size={24} />
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Sort */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name, representative, phone, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
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

          {/* Sort Select */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="name-asc">Company Name (A-Z)</option>
                <option value="recent">Recently Added</option>
                <option value="contact-asc">Contact Person (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
            <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-medium text-slate-600">Loading suppliers & distributors...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 space-y-3">
            <p className="font-semibold text-rose-800">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSuppliers} className="mx-auto border-rose-300">
              <RefreshCw size={14} className="mr-2" /> Try Again
            </Button>
          </div>
        )}

        {/* Suppliers Directory Table */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Company & Vendor</th>
                    <th className="px-4 py-3.5">Contact Person</th>
                    <th className="px-4 py-3.5">Phone Number</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Address</th>
                    <th className="px-4 py-3.5">Onboarded</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        <Truck size={40} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                        <h4 className="text-base font-semibold text-slate-700">No Suppliers Found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {search
                            ? `No supplier matching "${search}". Try resetting your search query.`
                            : "No suppliers registered yet. Click 'Add New Supplier' to onboard your first partner."}
                        </p>
                        {search && (
                          <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4">
                            Reset Search
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((s) => {
                      const avatarClass = getAvatarColor(s.name);

                      return (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedSupplier(s)}
                        >
                          {/* Company Name & Avatar */}
                          <td className="px-5 py-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border ${avatarClass} shadow-xs flex-shrink-0`}
                              >
                                {getInitials(s.name)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors block">
                                  {s.name}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">ID: {s.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Person */}
                          <td className="px-4 py-4 text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                {s.contactPerson.slice(0, 1).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800 text-xs sm:text-sm">
                                {s.contactPerson}
                              </span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-4 text-slate-700" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-800 font-medium">{s.phone}</span>
                              <button
                                onClick={() => copyToClipboard(s.phone, s.id)}
                                title="Copy Phone Number"
                                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                              >
                                {copiedId === s.id ? (
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                ) : (
                                  <Phone size={13} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-4 text-slate-500 text-xs" onClick={(e) => e.stopPropagation()}>
                            {s.email ? (
                              <a
                                href={`mailto:${s.email}`}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline max-w-[160px] truncate"
                              >
                                <Mail size={12} className="flex-shrink-0" />
                                <span className="truncate">{s.email}</span>
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Address */}
                          <td className="px-4 py-4 text-slate-500 text-xs max-w-[200px] truncate">
                            {s.address ? (
                              <span className="inline-flex items-center gap-1 text-slate-600" title={s.address}>
                                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                                <span className="truncate">{s.address}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Onboarded Date */}
                          <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{formatDate(s.createdAt)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSupplier(s)}
                                title="View Supplier Details"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(s)}
                                title="Edit Supplier"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(s)}
                                title="Delete Supplier"
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
            {filteredSuppliers.length > 0 && filteredSuppliers.length <= 10 && (
              <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredSuppliers.length}</strong> of{" "}
                  <strong className="text-slate-700">{suppliers.length}</strong> partners
                </span>
                <span className="hidden sm:inline">Click any supplier row to view full company profile</span>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredSuppliers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="partners"
            />
          </div>
        )}
      </div>

      {/* Supplier Profile View Modal */}
      {selectedSupplier && (
        <Modal
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          title="Supplier Profile & Overview"
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border ${getAvatarColor(
                  selectedSupplier.name
                )} shadow-xs flex-shrink-0`}
              >
                {getInitials(selectedSupplier.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 truncate">{selectedSupplier.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vendor Partner registered on {formatDate(selectedSupplier.createdAt)}
                </p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Representative</p>
                <h4 className="text-sm font-bold text-blue-900 mt-1 flex items-center gap-1.5 truncate">
                  <UserCheck size={16} /> {selectedSupplier.contactPerson}
                </h4>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Partner Status</p>
                <h4 className="text-sm font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Active Vendor
                </h4>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" /> Phone:
                </span>
                <span className="font-mono font-semibold text-slate-800">{selectedSupplier.phone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" /> Email:
                </span>
                <span className="text-slate-800">{selectedSupplier.email || "No email on record"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400" /> Address:
                </span>
                <span className="text-slate-800 text-right max-w-[240px]">
                  {selectedSupplier.address || "No address provided"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  const target = selectedSupplier;
                  setSelectedSupplier(null);
                  handleOpenEdit(target);
                }}
                className="gap-2"
              >
                <Pencil size={14} /> Edit Supplier
              </Button>
              <Button variant="outline" onClick={() => setSelectedSupplier(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Supplier Information" : "Register New Supplier"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Company / Vendor Name *"
            placeholder="e.g. Abbott Laboratories / Getz Pharma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Contact Person / Representative *"
            placeholder="e.g. Muhammad Aslam (Sales Manager)"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            required
          />

          <Input
            label="Official Phone / Mobile *"
            placeholder="e.g. 0321-9876543 / 021-34567890"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. orders@supplier.com (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Input
            label="Office / Warehouse Address *"
            placeholder="e.g. Plot 45, Industrial Estate, Karachi"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin mr-2" />
              ) : editingId ? (
                "Update Supplier"
              ) : (
                "Save Supplier"
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
            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete Supplier?</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{deleteConfirm.name}</strong>?
              This action will remove the supplier record and cannot be undone.
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
