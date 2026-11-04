"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, LogIn, LogOut, Key, Search, AlertCircle, RefreshCw, Download,
  Monitor, Globe, X, ChevronDown, Activity, ShieldCheck, ShieldAlert,
  History, Filter, Copy, Check, UserCheck, Laptop, Smartphone,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { loginHistoryService, LoginHistoryEntry } from "@/services/loginHistoryService";
import { toastApiError, toastSuccess } from "@/lib/toast";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: "success" | "danger" | "warning" | "info" | "default" }> = {
  Login:             { label: "Login",           icon: LogIn,       color: "success" },
  Logout:            { label: "Logout",          icon: LogOut,      color: "default" },
  "PIN Switch":      { label: "PIN Switch",      icon: Key,         color: "info"    },
  "Session Timeout": { label: "Session Timeout", icon: Clock,       color: "warning" },
  "Force Logout":    { label: "Force Logout",    icon: AlertCircle, color: "danger"  },
};

const ROLE_STYLES: Record<string, { badge: "default" | "info" | "success" | "warning" | "danger"; avatar: string }> = {
  admin:      { badge: "default", avatar: "bg-purple-100 text-purple-700 border-purple-200" },
  Admin:      { badge: "default", avatar: "bg-purple-100 text-purple-700 border-purple-200" },
  manager:    { badge: "info",    avatar: "bg-blue-100 text-blue-700 border-blue-200" },
  Manager:    { badge: "info",    avatar: "bg-blue-100 text-blue-700 border-blue-200" },
  cashier:    { badge: "success", avatar: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Cashier:    { badge: "success", avatar: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pharmacist: { badge: "warning", avatar: "bg-amber-100 text-amber-700 border-amber-200" },
  Pharmacist: { badge: "warning", avatar: "bg-amber-100 text-amber-700 border-amber-200" },
};

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 animate-pulse">
          <td className="px-5 py-4">
            <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
            <div className="h-2.5 bg-gray-100 rounded w-16" />
          </td>
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div>
                <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
                <div className="h-2.5 bg-gray-100 rounded w-36" />
              </div>
            </div>
          </td>
          <td className="px-5 py-4">
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </td>
          <td className="px-5 py-4">
            <div className="h-6 bg-gray-200 rounded-full w-24" />
          </td>
          <td className="px-5 py-4">
            <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
            <div className="h-2.5 bg-gray-100 rounded w-32" />
          </td>
        </tr>
      ))}
    </>
  );
}

function parseUserAgentInfo(ua: string | null): { browser: string; os: string; isMobile: boolean } {
  if (!ua) return { browser: "Unknown", os: "Unknown Device", isMobile: false };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  let os = "Device";
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os, isMobile };
}

function formatDisplayTime(iso: string): { formatted: string; relative: string } {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    let relative = "Just now";
    if (diffSec < 60) relative = `${diffSec}s ago`;
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
    else if (diffSec < 172800) relative = "Yesterday";
    else relative = `${Math.floor(diffSec / 86400)}d ago`;

    const formatted = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return { formatted, relative };
  } catch {
    return { formatted: iso, relative: "" };
  }
}

export default function LoginHistoryPage() {
  const [entries, setEntries]         = useState<LoginHistoryEntry[]>([]);
  const [stats, setStats]             = useState<{ total: number; today: number; failed: number }>({ total: 0, today: 0, failed: 0 });
  const [loading, setLoading]         = useState<boolean>(true);
  const [page, setPage]               = useState<number>(1);
  const [totalPages, setTotalPages]   = useState<number>(1);
  const [total, setTotal]             = useState<number>(0);

  const [search, setSearch]           = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [roleFilter, setRoleFilter]   = useState<string>("All");
  const [actionFilter, setActionFilter] = useState<string>("All");
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const roles = ["All", "Admin", "Manager", "Cashier", "Pharmacist"];
  const actions = ["All", "Login", "Logout", "PIN Switch", "Session Timeout", "Force Logout"];

  const hasActiveFilters: boolean = !!(search || roleFilter !== "All" || actionFilter !== "All");

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        loginHistoryService.getAll({
          page:   p,
          limit:  10,
          search: search || undefined,
          action: actionFilter !== "All" ? actionFilter : undefined,
        }),
        loginHistoryService.getStats(),
      ]);
      setEntries(historyRes.items ?? []);
      setTotal(historyRes.total);
      setTotalPages(historyRes.totalPages);
      setPage(p);
      setStats(statsRes);
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setRoleFilter("All");
    setActionFilter("All");
    setPage(1);
  };

  const handleCopyIp = (ip: string, id: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    toastSuccess("IP address copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    try {
      const csv = [
        ["Date & Time", "User", "Email", "Role", "Action", "Status", "IP Address", "User Agent"].join(","),
        ...entries.map(e => [
          e.createdAt,
          e.user?.name ?? "—",
          e.user?.email ?? "—",
          e.user?.role ?? "—",
          e.action,
          e.status,
          e.ipAddress ?? "—",
          e.userAgent ?? "—",
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `login-history-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Login history exported successfully");
    } catch (err) {
      toastApiError(err);
    }
  };

  // Filter items in frontend if role filter is set
  const filteredEntries = roleFilter === "All"
    ? entries
    : entries.filter(e => e.user?.role?.toLowerCase() === roleFilter.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <Header title="Login History" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header / Sub-banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Security & Login Audit Trail</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time monitoring of staff logins, sign-offs, device footprints, and authentication security.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchData(page)}
              disabled={loading}
              className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </Button>
            {entries.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="bg-white hover:bg-gray-50 shadow-2xs text-gray-700"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Executive Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Sessions */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Authentications</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-mono tracking-tight">{stats.total}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                All recorded system events
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <History size={22} />
            </div>
          </div>

          {/* Card 2: Today's Logins */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today's Active Logins</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">{stats.today}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sessions logged past 24 hours
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Clock size={22} />
            </div>
          </div>

          {/* Card 3: Security Status / Failed Attempts */}
          <div className={`rounded-2xl border p-5 shadow-xs flex items-center justify-between transition-colors ${
            stats.failed > 0
              ? "bg-amber-50/50 border-amber-200"
              : "bg-white border-gray-200/80"
          }`}>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Failed / Blocked Attempts</span>
              <p className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                stats.failed > 0 ? "text-amber-600" : "text-gray-900"
              }`}>
                {stats.failed}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {stats.failed > 0 ? (
                  <span className="text-amber-700 font-medium">⚠️ Review security logs</span>
                ) : (
                  <span className="text-emerald-600 font-medium">✓ Zero security warnings</span>
                )}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              stats.failed > 0
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-gray-50 text-gray-400 border-gray-200"
            }`}>
              {stats.failed > 0 ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </div>
          </div>
        </div>

        {/* ── Filters & Search Toolbar ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search staff by name, email, or IP address…"
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Action Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {actions.map((act) => {
                const active = actionFilter === act;
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => { setActionFilter(act); setPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-transparent"
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Filter Line (Roles & Quick Status) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Filter size={12} /> Staff Role:
              </span>
              {roles.map((r) => {
                const active = roleFilter === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "bg-[var(--theme-500,#2563eb)] text-white font-semibold shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X size={13} /> Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* ── Login History Data Table ── */}
        <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Staff User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Event Action</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Network & Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <TableSkeleton />
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                          <Activity size={24} />
                        </div>
                        <h4 className="text-base font-bold text-gray-800">No Login Activity Found</h4>
                        <p className="text-xs text-gray-500">
                          {hasActiveFilters
                            ? "No log entries match your selected search keyword or role filters."
                            : "Authentication events will be recorded here when operators access the POS."}
                        </p>
                        {hasActiveFilters && (
                          <Button size="sm" variant="outline" onClick={clearFilters}>
                            Clear Active Filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const { formatted, relative } = formatDisplayTime(entry.createdAt);
                    const ua = parseUserAgentInfo(entry.userAgent);
                    const actionInfo = ACTION_CONFIG[entry.action] ?? {
                      label: entry.action,
                      icon: LogIn,
                      color: "default" as const,
                    };
                    const ActionIcon = actionInfo.icon;
                    const isFailed = entry.status === "failed";
                    const roleStyle = ROLE_STYLES[entry.user?.role ?? ""] ?? {
                      badge: "default" as const,
                      avatar: "bg-gray-100 text-gray-700 border-gray-200",
                    };

                    const initials = entry.user?.name
                      ? entry.user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                      : "U";

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors group">
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-semibold text-gray-800 block">
                              {formatted}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {relative}
                            </span>
                          </div>
                        </td>

                        {/* Staff User */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${roleStyle.avatar}`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {entry.user?.name ?? "Unknown User"}
                              </p>
                              <p className="text-xs text-gray-400 truncate max-w-[170px]">
                                {entry.user?.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge variant={roleStyle.badge}>
                            {entry.user?.role ?? "Staff"}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100/80 text-gray-700 text-xs font-semibold">
                            <ActionIcon size={14} className="text-gray-500 shrink-0" />
                            <span>{entry.action}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isFailed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Success
                            </span>
                          )}
                        </td>

                        {/* Network & Device */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            {/* IP Address */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <Globe size={13} className="text-gray-400 shrink-0" />
                              <span className="font-mono font-medium text-gray-800">
                                {entry.ipAddress || "127.0.0.1"}
                              </span>
                              {entry.ipAddress && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyIp(entry.ipAddress!, entry.id)}
                                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer transition-colors"
                                  title="Copy IP"
                                >
                                  {copiedId === entry.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>

                            {/* Device & Browser */}
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                              {ua.isMobile ? <Smartphone size={12} className="shrink-0" /> : <Laptop size={12} className="shrink-0" />}
                              <span>{ua.browser} • {ua.os}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ── */}
          {!loading && filteredEntries.length > 0 && total <= 10 && (
            <div className="px-5 py-3.5 bg-gray-50/60 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">
                Showing <span className="font-bold text-gray-700">1</span> to{" "}
                <span className="font-bold text-gray-700">{filteredEntries.length}</span> of{" "}
                <span className="font-bold text-gray-700">{total}</span> recorded entries
              </span>
            </div>
          )}

          {!loading && (
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={10}
              onPageChange={fetchData}
              itemLabel="recorded entries"
            />
          )}
        </div>
      </div>
    </div>
  );
}
