"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Pill,
  Users,
  Truck,
  BarChart2,
  Settings,
  Cross,
  ClipboardList,
  ClipboardCheck,
  ArrowLeftRight,
  RotateCcw,
  Clock,
  LogOut,
  Sparkles,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { usePharmacyStore } from "@/store";
import { usePermissions, PERMISSIONS, PermissionKey } from "@/hooks/usePermissions";
import { THEMES } from "@/lib/themes";

// ── Per-theme sidebar config (inline styles — no CSS variable dependency) ──
const SIDEBAR_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    hoverBg: string;
    activeBg: string;
    activeText: string;
    muted: string;
    logoText: string;
    isLight: boolean;
  }
> = {
  blue: {
    bg: "#0f1f3d",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(37,99,235,0.22)",
    activeBg: "#2563eb",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  indigo: {
    bg: "#1e1b4b",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(99,102,241,0.20)",
    activeBg: "#4f46e5",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  purple: {
    bg: "#1a0533",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(147,51,234,0.20)",
    activeBg: "#7c3aed",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  green: {
    bg: "#022c22",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(5,150,105,0.20)",
    activeBg: "#059669",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  teal: {
    bg: "#03202b",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(8,145,178,0.20)",
    activeBg: "#0891b2",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  cyan: {
    bg: "#03243b",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(14,165,233,0.20)",
    activeBg: "#0ea5e9",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  orange: {
    bg: "#1c0a00",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(217,119,6,0.20)",
    activeBg: "#d97706",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  rose: {
    bg: "#3b0016",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.60)",
    hoverBg: "rgba(225,29,72,0.20)",
    activeBg: "#e11d48",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.38)",
    logoText: "#ffffff",
    isLight: false,
  },
  black: {
    bg: "#09090b",
    border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.55)",
    hoverBg: "rgba(255,255,255,0.08)",
    activeBg: "#27272a",
    activeText: "#ffffff",
    muted: "rgba(255,255,255,0.32)",
    logoText: "#ffffff",
    isLight: false,
  },
  white: {
    bg: "#ffffff",
    border: "#e2e8f0",
    text: "#64748b",
    hoverBg: "#f1f5f9",
    activeBg: "#eff6ff",
    activeText: "#2563eb",
    muted: "#94a3b8",
    logoText: "#0f172a",
    isLight: true,
  },
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: PermissionKey;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "MAIN TERMINAL",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
      { label: "Point of Sale", href: "/sales", icon: ShoppingCart, permission: PERMISSIONS.SALES_CREATE, badge: "POS" },
    ],
  },
  {
    title: "INVENTORY & PROCUREMENT",
    items: [
      { label: "Inventory", href: "/inventory", icon: Package, permission: PERMISSIONS.INVENTORY_VIEW },
      { label: "Medicines", href: "/medicines", icon: Pill, permission: PERMISSIONS.MEDICINES_READ },
      { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList, permission: PERMISSIONS.PURCHASE_ORDERS_READ },
      { label: "Stock Count", href: "/stock-count", icon: ClipboardCheck, permission: PERMISSIONS.STOCK_COUNT_VIEW },
      { label: "Suppliers", href: "/suppliers", icon: Truck, permission: PERMISSIONS.SUPPLIERS_READ },
      { label: "Transfers", href: "/transfers", icon: ArrowLeftRight, permission: PERMISSIONS.TRANSFERS_READ },
    ],
  },
  {
    title: "MANAGEMENT & AUDIT",
    items: [
      { label: "Customers", href: "/customers", icon: Users, permission: PERMISSIONS.CUSTOMERS_READ },
      { label: "Returns & Refunds", href: "/returns", icon: RotateCcw, permission: PERMISSIONS.RETURNS_READ },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart2, permission: PERMISSIONS.REPORTS_VIEW },
      { label: "Login History", href: "/login-history", icon: Clock, permission: PERMISSIONS.LOGIN_HISTORY_VIEW },
      { label: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, settings } = usePharmacyStore();

  const { can, isAdmin } = usePermissions();
  const cfg = SIDEBAR_CONFIG[settings.themeColor] ?? SIDEBAR_CONFIG.indigo;
  const activeSwatch = THEMES.find((t) => t.key === settings.themeColor)?.swatch ?? "#4f46e5";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    authService.removeToken();
    logout();
    router.push("/login");
  };

  // Render minimal shell during hydration to avoid layout shift
  if (!mounted) {
    return (
      <aside
        style={{
          backgroundColor: cfg.bg,
          borderRight: `1px solid ${cfg.border}`,
        }}
        className="w-[260px] h-screen sticky top-0 flex flex-col shrink-0 overflow-hidden"
      />
    );
  }

  return (
    <aside
      style={{
        backgroundColor: cfg.bg,
        borderRight: `1px solid ${cfg.border}`,
        transition: "background-color 0.25s ease, border-color 0.25s ease",
      }}
      className="w-[260px] h-screen sticky top-0 flex flex-col shrink-0 overflow-hidden select-none"
    >
      {/* ── Brand Logo Header ── */}
      <div
        style={{ borderBottom: `1px solid ${cfg.border}` }}
        className="px-5 py-4.5 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-black/10 transition-transform duration-200 hover:scale-105"
            style={{ backgroundColor: cfg.isLight ? "#0f172a" : activeSwatch }}
          >
            <Cross size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="font-black text-base tracking-tight truncate leading-tight"
                style={{ color: cfg.logoText }}
              >
                {settings.pharmacyName || "PharmaPOS"}
              </span>
              <span
                className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider"
                style={{
                  backgroundColor: cfg.isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)",
                  color: cfg.isLight ? "#475569" : "rgba(255,255,255,0.85)",
                }}
              >
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className="text-xs truncate font-medium" style={{ color: cfg.muted }}>
                {currentUser?.branch || "Main Pharmacy Branch"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Items Grouped ── */}
      <style>{`
        .sidebar-no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <nav
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="sidebar-no-scrollbar flex-1 px-3 py-2.5 space-y-3.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden"
      >
        {navGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-0.5">
              {/* Group Title */}
              <div className="px-3 pb-1">
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: cfg.muted }}
                >
                  {group.title}
                </p>
              </div>

              {/* Group Links */}
              {visibleItems.map(({ label, href, icon: Icon, badge }) => {
                const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    style={
                      isActive
                        ? {
                            backgroundColor: cfg.activeBg,
                            color: cfg.activeText,
                            boxShadow: cfg.isLight
                              ? "0 1px 3px rgba(0,0,0,0.06)"
                              : "0 2px 8px rgba(0,0,0,0.2)",
                          }
                        : { color: cfg.text }
                    }
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group"
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = cfg.hoverBg;
                        (e.currentTarget as HTMLElement).style.color = cfg.activeText;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLElement).style.color = cfg.text;
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={`shrink-0 transition-transform duration-150 ${
                          isActive ? "scale-105" : "group-hover:scale-105"
                        }`}
                      />
                      <span className="truncate">{label}</span>
                    </div>

                    {badge && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: isActive
                            ? "rgba(255,255,255,0.22)"
                            : cfg.isLight
                            ? "#e0e7ff"
                            : "rgba(255,255,255,0.1)",
                          color: isActive
                            ? "#ffffff"
                            : cfg.isLight
                            ? "#3730a3"
                            : "rgba(255,255,255,0.8)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── User Session Footer Card ── */}
      <div
        style={{
          borderTop: `1px solid ${cfg.border}`,
          backgroundColor: cfg.isLight ? "#f8fafc" : "rgba(0,0,0,0.15)",
        }}
        className="p-3.5 flex-shrink-0"
      >
        <div className="flex items-center gap-2.5">
          {/* Cashier / Admin Avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs"
            style={{
              backgroundColor: cfg.isLight ? "#e2e8f0" : activeSwatch,
              color: cfg.isLight ? "#0f172a" : "#ffffff",
            }}
          >
            {currentUser?.name?.[0]?.toUpperCase() ?? (isAdmin ? "A" : "C")}
          </div>

          {/* User Meta */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-bold truncate leading-tight"
              style={{ color: cfg.logoText }}
              title={currentUser?.name}
            >
              {currentUser?.name ?? (isAdmin ? "Administrator" : "Cashier Staff")}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wide"
                style={{
                  backgroundColor: isAdmin
                    ? "rgba(239,68,68,0.18)"
                    : "rgba(16,185,129,0.18)",
                  color: isAdmin ? "#ef4444" : "#10b981",
                }}
              >
                {isAdmin ? "Admin" : "Cashier"}
              </span>
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl transition-all duration-150"
            style={{ color: cfg.muted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
              (e.currentTarget as HTMLElement).style.backgroundColor = cfg.isLight
                ? "#fee2e2"
                : "rgba(239,68,68,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = cfg.muted;
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
