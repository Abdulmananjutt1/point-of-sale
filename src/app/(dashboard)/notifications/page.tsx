"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  AlertTriangle,
  Package,
  RotateCcw,
  ShoppingCart,
  Info,
  RefreshCw,
  Loader2,
  Clock,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Boxes,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import { notificationService, Notification } from "@/services/notificationService";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

const TYPE_CONFIG: Record<
  Notification["type"],
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    label: string;
    badge: "default" | "warning" | "danger" | "success" | "info";
  }
> = {
  LowStock: {
    icon: Package,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Low Stock",
    badge: "warning",
  },
  ExpiryAlert: {
    icon: AlertTriangle,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    label: "Expiry Alert",
    badge: "danger",
  },
  ReturnProcessed: {
    icon: RotateCcw,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    label: "Return Processed",
    badge: "info",
  },
  PurchaseOrder: {
    icon: ShoppingCart,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    label: "Purchase Order",
    badge: "default",
  },
  System: {
    icon: Info,
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    label: "System Event",
    badge: "default",
  },
};

type FilterType = "all" | "unread" | Notification["type"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const result = await notificationService.getAll({ page: p, limit: 10 });
      setNotifications(result.items ?? []);
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
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      toastSuccess("Notification marked as read");
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toastSuccess("All notifications marked as read");
    } catch (err) {
      toastApiError(err);
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Metrics Calculation ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const stockAlerts = notifications.filter((n) => n.type === "LowStock").length;
    const expiryAlerts = notifications.filter((n) => n.type === "ExpiryAlert").length;
    return { unread, stockAlerts, expiryAlerts };
  }, [notifications]);

  // ── Filtered List ──────────────────────────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    if (filter === "all") {
      return notifications;
    }
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const FILTER_TABS: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All Alerts", count: notifications.length },
    { key: "unread", label: "Unread", count: stats.unread },
    { key: "LowStock", label: "Low Stock", count: stats.stockAlerts },
    { key: "ExpiryAlert", label: "Expiry Risks", count: stats.expiryAlerts },
    { key: "ReturnProcessed", label: "Returns" },
    { key: "PurchaseOrder", label: "Orders" },
    { key: "System", label: "System" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header title="Notifications & System Alerts" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Bell size={22} />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Notifications & System Alerts</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live updates on medicine stockouts, imminent batch expirations, returned orders, and PO shipments.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNotifications(page)}
              disabled={loading}
              className="gap-2 text-slate-700 bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            {stats.unread > 0 && (
              <Button
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-600/20"
              >
                {markingAll ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCheck size={15} />
                )}
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Executive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Alerts */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Notifications</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <ShieldCheck size={13} className="text-emerald-500" />
                Activity stream
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Bell size={22} />
            </div>
          </div>

          {/* Unread Alerts */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unread Alerts</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.unread}</h3>
              <p
                className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  stats.unread > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"
                }`}
              >
                {stats.unread > 0 ? (
                  <>
                    <AlertTriangle size={13} /> Requires pharmacist review
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> All notifications cleared
                  </>
                )}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                stats.unread > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <Sparkles size={22} />
            </div>
          </div>

          {/* Stock & Expiry Risks */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory Warnings</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {stats.stockAlerts + stats.expiryAlerts}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Boxes size={13} className="text-rose-500" />
                {stats.stockAlerts} low stock · {stats.expiryAlerts} expiry
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map(({ key, label, count }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[var(--theme-500,#2563eb)] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : key === "unread"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200/60 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification Stream Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 size={30} className="animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Notifications</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filter !== "all"
                  ? "No alerts found under this filter category."
                  : "You're completely caught up! No active warnings or system alerts."}
              </p>
              {filter !== "all" && (
                <button
                  onClick={() => setFilter("all")}
                  className="mt-3.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg transition-colors"
                >
                  Show All Alerts
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.System;
                const Icon = cfg.icon;

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4.5 transition-all hover:bg-slate-50/70 group ${
                      !n.isRead ? "bg-indigo-50/30 border-l-4 border-l-indigo-500" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border} shadow-2xs`}
                    >
                      <Icon size={18} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-sm font-bold ${
                              n.isRead ? "text-slate-800" : "text-slate-900"
                            }`}
                          >
                            {n.title}
                          </h4>
                          <Badge variant={cfg.badge}>{cfg.label}</Badge>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          n.isRead ? "text-slate-600" : "text-slate-800 font-medium"
                        }`}
                      >
                        {n.message}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
                        <Clock size={12} />
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action button */}
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shrink-0"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredNotifications.length > 0 && total <= 10 && (
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing <strong>{filteredNotifications.length}</strong> of {total} notifications</span>
            </div>
          )}

          {!loading && (
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={10}
              onPageChange={fetchNotifications}
              itemLabel="notifications"
            />
          )}
        </div>
      </div>
    </div>
  );
}
