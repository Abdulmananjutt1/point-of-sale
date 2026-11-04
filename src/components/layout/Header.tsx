"use client";

import { Bell, Search, Palette, Check, BellOff, AlertTriangle, Package, RotateCcw, Info, ShoppingCart, CheckCheck, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePharmacyStore } from "@/store";
import { ThemeColor } from "@/types";
import { THEMES } from "@/lib/themes";
import { notificationService, Notification } from "@/services/notificationService";
import { apiGet } from "@/lib/apiClient";
import { authService } from "@/services/authService";
import toast from "react-hot-toast";
import Link from "next/link";

interface HeaderProps {
  title: string;
}

const TYPE_ICON: Record<Notification["type"], React.ElementType> = {
  LowStock:        Package,
  ExpiryAlert:     AlertTriangle,
  ReturnProcessed: RotateCcw,
  PurchaseOrder:   ShoppingCart,
  System:          Info,
};

const TYPE_COLOR: Record<Notification["type"], string> = {
  LowStock:        "text-yellow-600",
  ExpiryAlert:     "text-orange-600",
  ReturnProcessed: "text-blue-600",
  PurchaseOrder:   "text-purple-600",
  System:          "text-gray-500",
};

interface SearchResult {
  id:       string;
  label:    string;
  sub?:     string;
  href:     string;
  category: string;
}

// Context-aware search: different endpoints per page
function useContextSearch(pathname: string, query: string) {
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); return; }
    // Only search if token present
    if (!authService.getToken()) return;
    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Always search medicines
      const medData = await apiGet<{ items: { id: string; name: string; genericName: string; brand: string }[] }>(
        "/medicines", { search: q, limit: 3 }
      );
      (medData.items ?? []).forEach((m) => searchResults.push({
        id: m.id, label: m.name,
        sub: `${m.genericName} · ${m.brand}`,
        href: "/medicines",
        category: "Medicine",
      }));

      // Search customers if not on sales-only page
      if (pathname !== "/sales") {
        const cusData = await apiGet<{ items: { id: string; name: string; phone: string }[] }>(
          "/customers", { search: q, limit: 3 }
        );
        (cusData.items ?? []).forEach((c) => searchResults.push({
          id: c.id, label: c.name, sub: c.phone,
          href: "/customers",
          category: "Customer",
        }));
      }

      // Search sales by invoice
      const saleData = await apiGet<{ items: { id: string; invoiceNumber: string; customerName: string; total: number }[] }>(
        "/sales", { search: q, limit: 3 }
      );
      (saleData.items ?? []).forEach((s) => searchResults.push({
        id: s.id, label: s.invoiceNumber, sub: s.customerName,
        href: "/reports",
        category: "Invoice",
      }));

      setResults(searchResults.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query) { setResults([]); return; }
    timerRef.current = setTimeout(() => doSearch(query), 350);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  return { results, loading };
}

export default function Header({ title }: HeaderProps) {
  const router        = useRouter();
  const pathname      = usePathname();
  const themeColor    = usePharmacyStore((s) => s.settings.themeColor);
  const updateSettings= usePharmacyStore((s) => s.updateSettings);

  const [now, setNow]                           = useState<Date | null>(null);
  const [showPicker, setShowPicker]             = useState(false);
  const [showNotifs, setShowNotifs]             = useState(false);
  const [showSearch, setShowSearch]             = useState(false);
  const [searchQuery, setSearchQuery]           = useState("");
  const [notifications, setNotifications]       = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]           = useState(0);
  const [notifsLoading, setNotifsLoading]       = useState(false);
  const [markingAll, setMarkingAll]             = useState(false);

  const pickerRef  = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLDivElement>(null);

  const { results: searchResults, loading: searchLoading } = useContextSearch(pathname, searchQuery);

  useEffect(() => { setNow(new Date()); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  setShowNotifs(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setShowSearch(false); setSearchQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    if (!authService.getToken()) return;
    notificationService.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  const fetchNotifications = async () => {
    if (!authService.getToken()) return;
    setNotifsLoading(true);
    try {
      const result = await notificationService.getAll({ limit: 8 });
      setNotifications(result.items ?? []);
      setUnreadCount((result.items ?? []).filter((n) => !n.isRead).length);
    } catch { /* ignore */ }
    finally { setNotifsLoading(false); }
  };

  const handleBellClick = () => {
    if (!showNotifs) fetchNotifications();
    setShowNotifs((p) => !p);
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await notificationService.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  };

  const handleThemeChange = (key: ThemeColor) => {
    updateSettings({ themeColor: key });
    setShowPicker(false);
    const label = THEMES.find((t) => t.key === key)?.label ?? key;
    toast.success(`Theme: ${label}`);
  };

  const handleSearchResultClick = (href: string) => {
    router.push(href);
    setShowSearch(false);
    setSearchQuery("");
  };

  const activeTheme  = THEMES.find((t) => t.key === themeColor);
  const activeSwatch = activeTheme?.swatch ?? "#4f46e5";
  const isLightSwatch = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>

      <div className="flex items-center gap-2">

        {/* ── Global Search ── */}
        <div className="relative hidden md:flex items-center" ref={searchRef}>
          <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none z-10" />
          <input
            type="search"
            placeholder="Quick search…"
            value={searchQuery}
            onFocus={() => setShowSearch(true)}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 transition-all focus:w-64 focus:bg-white"
          />
          {searchQuery && showSearch && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {searchLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  <span className="text-sm">Searching…</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">
                  No results for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <>
                  {searchResults.map((r) => (
                    <button
                      key={`${r.category}-${r.id}`}
                      onClick={() => handleSearchResultClick(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                        {r.category}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const q = encodeURIComponent(searchQuery);
                      router.push(`/medicines?search=${q}`);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="w-full px-4 py-3 text-center text-xs text-blue-600 hover:text-blue-800 font-medium border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Search &ldquo;{searchQuery}&rdquo; across all records →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Theme Picker ── */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Change theme"
          >
            <Palette size={18} />
            <span
              className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: activeSwatch }}
            />
          </button>

          {showPicker && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Choose Theme</p>
              <div className="grid grid-cols-5 gap-2">
                {THEMES.map(({ key, label, swatch, previewBg }) => {
                  const isActive    = themeColor === key;
                  const bg          = previewBg ?? swatch;
                  const lightSwatch = isLightSwatch(bg);
                  return (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      title={label}
                      className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                        isActive ? "ring-2 ring-offset-1 ring-gray-400" : "hover:scale-105"
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${lightSwatch ? "border border-gray-200" : ""}`}
                        style={{ background: bg }}
                      >
                        {isActive && <Check size={15} strokeWidth={3} className={lightSwatch ? "text-gray-700" : "text-white"} />}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-500 leading-tight text-center truncate w-full">
                        {label.split(" ").pop()}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ background: activeSwatch }} />
                <span className="text-xs font-semibold text-gray-700">{activeTheme?.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Notifications Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-gray-700" />
                  <span className="text-sm font-bold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    {markingAll ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifsLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <Loader2 size={18} className="animate-spin mr-2" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <BellOff size={24} className="mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = TYPE_ICON[n.type] ?? Info;
                    const clr  = TYPE_COLOR[n.type] ?? "text-gray-500";
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-default ${
                          !n.isRead ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.isRead ? "bg-gray-100" : "bg-white border border-gray-200"}`}>
                          <Icon size={15} className={clr} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${n.isRead ? "text-gray-600" : "text-gray-900"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkRead(n.id, e)}
                            className="p-1 text-blue-400 hover:text-blue-600 rounded transition-colors shrink-0 mt-0.5"
                            title="Mark read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifs(false)}
                  className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Date ── */}
        <div className="hidden lg:block text-xs font-medium text-gray-400 ml-1">
          {now?.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      </div>
    </header>
  );
}
