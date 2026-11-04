"use client";

import { useState, useEffect } from "react";
import {
  Store, Receipt, Shield, Palette, Trash2, Plus, Check, Users, Pencil,
  Building2, MapPin, Phone, FileText, Clock, AlertTriangle, Sparkles,
  Sliders, DollarSign, Info, ReceiptText, CheckCircle2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import { usePharmacyStore } from "@/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ThemeColor, User, UserRole } from "@/types";
import { THEMES } from "@/lib/themes";
import toast from "react-hot-toast";

type SettingsTab = "pharmacy" | "pos" | "permissions" | "appearance" | "expenses" | "users";

const ROLES: UserRole[] = ["Admin", "Manager", "Cashier", "Pharmacist"];

const ROLE_COLORS: Record<UserRole, "default" | "info" | "success" | "warning"> = {
  Admin: "default",
  Manager: "info",
  Cashier: "success",
  Pharmacist: "warning",
};

const EMPTY_USER = {
  username: "",
  name: "",
  email: "",
  role: "Cashier" as UserRole,
  pin: "",
  isActive: true,
  branch: "Main Branch",
};

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    expenses,
    addExpense,
    deleteExpense,
    users,
    addUser,
    updateUser,
  } = usePharmacyStore();

  const [tab, setTab] = useState<SettingsTab>("pharmacy");
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState(EMPTY_USER);

  // Local copies so we can edit and save atomically
  const [pharForm, setPharForm] = useState({
    pharmacyName: settings.pharmacyName,
    address: settings.address,
    phone: settings.phone,
    licenseNumber: settings.licenseNumber ?? "",
    taxNumber: settings.taxNumber ?? "",
    footerText: settings.footerText ?? "",
  });

  const [posForm, setPosForm] = useState({
    taxRate: String(settings.taxRate * 100),
    invoicePrefix: settings.invoicePrefix,
    currency: settings.currency,
    lowStockThreshold: String(settings.lowStockThreshold),
    expiryWarnDays: String(settings.expiryWarnDays ?? 90),
    autoLogoutMinutes: String(settings.autoLogoutMinutes ?? 30),
    receiptTemplate: settings.receiptTemplate,
  });

  const [permForm, setPermForm] = useState({
    allowLineDiscount: settings.allowLineDiscount,
    allowBillDiscount: settings.allowBillDiscount,
    allowSplitPayment: settings.allowSplitPayment,
    allowHoldSale: settings.allowHoldSale,
    allowCreditSales: settings.allowCreditSales ?? true,
    requireRxUpload: settings.requireRxUpload ?? false,
  });

  // Keep local in sync if store changes externally
  useEffect(() => {
    setPharForm({
      pharmacyName: settings.pharmacyName,
      address: settings.address,
      phone: settings.phone,
      licenseNumber: settings.licenseNumber ?? "",
      taxNumber: settings.taxNumber ?? "",
      footerText: settings.footerText ?? "",
    });
    setPosForm({
      taxRate: String(settings.taxRate * 100),
      invoicePrefix: settings.invoicePrefix,
      currency: settings.currency,
      lowStockThreshold: String(settings.lowStockThreshold),
      expiryWarnDays: String(settings.expiryWarnDays ?? 90),
      autoLogoutMinutes: String(settings.autoLogoutMinutes ?? 30),
      receiptTemplate: settings.receiptTemplate,
    });
    setPermForm({
      allowLineDiscount: settings.allowLineDiscount,
      allowBillDiscount: settings.allowBillDiscount,
      allowSplitPayment: settings.allowSplitPayment,
      allowHoldSale: settings.allowHoldSale,
      allowCreditSales: settings.allowCreditSales ?? true,
      requireRxUpload: settings.requireRxUpload ?? false,
    });
  }, [settings]);

  // Expense form state
  const [expForm, setExpForm] = useState({
    description: "",
    amount: "",
    category: "Utilities",
    date: "",
  });
  const [invoiceDateStr, setInvoiceDateStr] = useState("");
  const [expensePage, setExpensePage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setExpForm((prev) => ({ ...prev, date: todayISO }));
    setInvoiceDateStr(`${yy}${mm}${dd}`);
  }, []);

  const savePharForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharForm.pharmacyName.trim()) {
      toast.error("Pharmacy name is required");
      return;
    }
    updateSettings({
      pharmacyName: pharForm.pharmacyName.trim(),
      address: pharForm.address.trim(),
      phone: pharForm.phone.trim(),
      licenseNumber: pharForm.licenseNumber.trim() || undefined,
      taxNumber: pharForm.taxNumber.trim() || undefined,
      footerText: pharForm.footerText.trim() || undefined,
    });
    toast.success("Pharmacy information updated successfully!");
  };

  const savePosForm = (e: React.FormEvent) => {
    e.preventDefault();
    const taxRate = Math.max(0, Math.min(100, Number(posForm.taxRate))) / 100;
    const lowStockThreshold = Math.max(1, Number(posForm.lowStockThreshold) || 10);
    const expiryWarnDays = Math.max(1, Number(posForm.expiryWarnDays) || 90);
    const autoLogoutMinutes = Math.max(1, Number(posForm.autoLogoutMinutes) || 30);
    if (!posForm.invoicePrefix.trim()) {
      toast.error("Invoice prefix is required");
      return;
    }
    updateSettings({
      taxRate,
      invoicePrefix: posForm.invoicePrefix.trim().toUpperCase(),
      currency: posForm.currency.trim(),
      lowStockThreshold,
      expiryWarnDays,
      autoLogoutMinutes,
      receiptTemplate: posForm.receiptTemplate,
    });
    toast.success("POS configuration saved successfully!");
  };

  const savePermForm = () => {
    updateSettings(permForm);
    toast.success("POS permissions saved successfully!");
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.description.trim() || !expForm.amount) {
      toast.error("Please fill in description and amount");
      return;
    }
    addExpense({
      description: expForm.description.trim(),
      amount: Number(expForm.amount),
      category: expForm.category,
      date: expForm.date || new Date().toISOString().split("T")[0],
    });
    toast.success("Expense logged successfully!");
    setExpForm({
      description: "",
      amount: "",
      category: "Utilities",
      date: new Date().toISOString().split("T")[0],
    });
  };

  const TABS: { key: SettingsTab; label: string; icon: React.ElementType; desc: string }[] = [
    { key: "pharmacy",    label: "Pharmacy Info",   icon: Store,      desc: "Store name, address & receipt header" },
    { key: "pos",         label: "POS & Billing",   icon: Receipt,    desc: "Tax rates, numbering & invoice format" },
    { key: "permissions", label: "Permissions",     icon: Shield,     desc: "Terminal discounts & payment rules" },
    { key: "appearance",  label: "Appearance",      icon: Palette,    desc: "Color theme & interface branding" },
    { key: "expenses",    label: "Expenses",        icon: Trash2,     desc: "Operating expense tracking & log" },
    { key: "users",       label: "Staff & Users",   icon: Users,      desc: "Employee accounts, PINs & access" },
  ];

  // ── User form handlers ─────────────────────────────────────────────────────
  const openAddUser = () => {
    setEditingUser(null);
    setUserForm(EMPTY_USER);
    setUserModal(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      pin: u.pin ?? "",
      isActive: u.isActive,
      branch: u.branch ?? "Main Branch",
    });
    setUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.name.trim() || !userForm.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (userForm.pin && (userForm.pin.length !== 4 || !/^\d+$/.test(userForm.pin))) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (editingUser) {
      updateUser(editingUser.id, {
        ...userForm,
        username: userForm.username.trim(),
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        pin: userForm.pin || undefined,
      });
      toast.success("User account updated");
    } else {
      addUser({
        ...userForm,
        username: userForm.username.trim(),
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        pin: userForm.pin || undefined,
      });
      toast.success("New user added");
    }
    setUserModal(false);
  };

  const selectCls = "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <Header title="Settings" />

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Page Header / Sub-banner ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">System & Store Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure store profiles, billing rules, theme appearance, and staff permissions.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-600">PharmaPOS v2.0 • Online</span>
          </div>
        </div>

        {/* ── Mobile Horizontal Tab Navigation (Scrollable) ── */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Desktop Layout: Sidebar + Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Left Sidebar Navigation ── */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4 sticky top-24">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-2 space-y-1">
              {TABS.map(({ key, label, icon: Icon, desc }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all select-none cursor-pointer group ${
                      active
                        ? "bg-blue-50/80 text-blue-700 border border-blue-200/60 shadow-2xs font-semibold"
                        : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 border border-transparent"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                      active
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700"
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold leading-tight">{label}</span>
                        {active && <CheckCircle2 size={14} className="text-blue-600 shrink-0" />}
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${active ? "text-blue-600/80" : "text-gray-400"}`}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm border border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-300">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Current Branch</h4>
                  <p className="text-sm font-semibold truncate text-white">{settings.pharmacyName || "Main Pharmacy"}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block">Currency</span>
                  <span className="font-semibold text-white">{settings.currency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tax Rate</span>
                  <span className="font-semibold text-white">{settings.taxRate * 100}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Tab Content Area ── */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">

            {/* ══════════════════════════════════════════════════════════
                TAB 1: PHARMACY INFO
               ══════════════════════════════════════════════════════════ */}
            {tab === "pharmacy" && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 pb-2 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Store size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Pharmacy Profile & Header</h2>
                      <p className="text-xs text-gray-500">
                        Information displayed on POS receipts, customer invoices, and reports.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={savePharForm} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Input
                          label="Pharmacy / Store Name *"
                          value={pharForm.pharmacyName}
                          onChange={(e) => setPharForm({ ...pharForm, pharmacyName: e.target.value })}
                          placeholder="e.g. Al-Shifa Pharmacy"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Input
                          label="Full Address"
                          value={pharForm.address}
                          onChange={(e) => setPharForm({ ...pharForm, address: e.target.value })}
                          placeholder="Shop #4, Main Medical Plaza, Karachi"
                        />
                      </div>

                      <Input
                        label="Phone Number"
                        type="tel"
                        value={pharForm.phone}
                        onChange={(e) => setPharForm({ ...pharForm, phone: e.target.value })}
                        placeholder="021-12345678"
                      />

                      <Input
                        label="Drug License Number"
                        value={pharForm.licenseNumber}
                        onChange={(e) => setPharForm({ ...pharForm, licenseNumber: e.target.value })}
                        placeholder="DL-KHI-2026-09"
                      />

                      <div className="sm:col-span-2">
                        <Input
                          label="Tax / NTN / STRN Number"
                          value={pharForm.taxNumber}
                          onChange={(e) => setPharForm({ ...pharForm, taxNumber: e.target.value })}
                          placeholder="NTN-9876543-2"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700">Receipt Footer Note</label>
                        <textarea
                          value={pharForm.footerText}
                          onChange={(e) => setPharForm({ ...pharForm, footerText: e.target.value })}
                          rows={2}
                          placeholder="Thank you for trusting Al-Shifa! No return without receipt within 3 days."
                          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                        />
                        <span className="text-[11px] text-gray-400">Printed at the bottom of every customer invoice.</span>
                      </div>
                    </div>

                    {/* Receipt Preview Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <ReceiptText size={14} /> Receipt Header Live Preview
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-center max-w-sm mx-auto shadow-2xs font-mono text-xs space-y-0.5">
                        <p className="font-bold text-sm text-gray-900">{pharForm.pharmacyName || "PHARMACY NAME"}</p>
                        <p className="text-gray-500 text-[11px]">{pharForm.address || "Store Address Here"}</p>
                        <p className="text-gray-500 text-[11px]">Tel: {pharForm.phone || "0300-0000000"}</p>
                        {pharForm.licenseNumber && <p className="text-gray-400 text-[10px]">Lic: {pharForm.licenseNumber}</p>}
                        {pharForm.taxNumber && <p className="text-gray-400 text-[10px]">NTN: {pharForm.taxNumber}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                      <Button type="submit" className="px-6">
                        <Check size={16} /> Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 2: POS & BILLING SETTINGS
               ══════════════════════════════════════════════════════════ */}
            {tab === "pos" && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 pb-2 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">POS & Billing Configuration</h2>
                      <p className="text-xs text-gray-500">
                        Manage invoice serials, sales tax rules, currency symbols, and inventory thresholds.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={savePosForm} className="p-6 space-y-6">
                    {/* Section 1: Financial & Invoicing */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <DollarSign size={14} className="text-gray-500" /> Financial & Numbering
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                          label="Tax Rate (%)"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={posForm.taxRate}
                          onChange={(e) => setPosForm({ ...posForm, taxRate: e.target.value })}
                          placeholder="0"
                        />
                        <Input
                          label="Invoice Prefix *"
                          value={posForm.invoicePrefix}
                          onChange={(e) => setPosForm({ ...posForm, invoicePrefix: e.target.value.toUpperCase() })}
                          placeholder="INV"
                          required
                        />
                        <Input
                          label="Currency Code"
                          value={posForm.currency}
                          onChange={(e) => setPosForm({ ...posForm, currency: e.target.value })}
                          placeholder="PKR"
                        />
                      </div>

                      {/* Live Invoice Preview */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                        <span className="text-gray-500 font-medium">Sample Generated Invoice ID:</span>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                          {posForm.invoicePrefix || "INV"}-{invoiceDateStr}-0001
                        </span>
                      </div>
                    </div>

                    {/* Section 2: Stock Alerts & Session Timeout */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <AlertTriangle size={14} className="text-gray-500" /> Stock Alerts & Session Limits
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                          label="Low Stock Warning Level"
                          type="number"
                          min={1}
                          value={posForm.lowStockThreshold}
                          onChange={(e) => setPosForm({ ...posForm, lowStockThreshold: e.target.value })}
                          placeholder="10"
                        />
                        <Input
                          label="Expiry Alert Notice (Days)"
                          type="number"
                          min={1}
                          value={posForm.expiryWarnDays}
                          onChange={(e) => setPosForm({ ...posForm, expiryWarnDays: e.target.value })}
                          placeholder="90"
                        />
                        <Input
                          label="Auto Logout (Minutes)"
                          type="number"
                          min={1}
                          value={posForm.autoLogoutMinutes}
                          onChange={(e) => setPosForm({ ...posForm, autoLogoutMinutes: e.target.value })}
                          placeholder="30"
                        />
                      </div>
                    </div>

                    {/* Section 3: Receipt Format */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                        Receipt Printer Format
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: "thermal", label: "Thermal Receipt (80mm / POS)", desc: "Standard roll printer slip for fast counter checkout" },
                          { id: "a4", label: "A4 / Letter Full Invoice", desc: "Detailed full page invoice for credit or institutional billing" },
                        ].map((fmt) => {
                          const active = posForm.receiptTemplate === fmt.id;
                          return (
                            <div
                              key={fmt.id}
                              onClick={() => setPosForm({ ...posForm, receiptTemplate: fmt.id as "thermal" | "a4" })}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                                active
                                  ? "border-blue-600 bg-blue-50/50 shadow-2xs"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                active ? "border-blue-600 bg-blue-600" : "border-gray-300"
                              }`}>
                                {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${active ? "text-blue-900" : "text-gray-800"}`}>
                                  {fmt.label}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{fmt.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                      <Button type="submit" className="px-6">
                        <Check size={16} /> Save POS Settings
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 3: POS PERMISSIONS
               ══════════════════════════════════════════════════════════ */}
            {tab === "permissions" && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">POS Checkout Permissions</h2>
                        <p className="text-xs text-gray-500">
                          Toggle specific billing privileges and cashier restrictions.
                        </p>
                      </div>
                    </div>
                    <Button onClick={savePermForm} size="sm">
                      <Check size={16} /> Save Rules
                    </Button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {[
                      {
                        key: "allowLineDiscount" as const,
                        label: "Item-level Discounts",
                        desc: "Permit cashiers to discount individual items directly in cart",
                        icon: Sliders,
                      },
                      {
                        key: "allowBillDiscount" as const,
                        label: "Total Invoice Discount",
                        desc: "Permit applying flat or percentage discount to the entire bill",
                        icon: Receipt,
                      },
                      {
                        key: "allowSplitPayment" as const,
                        label: "Multi-Method Split Payment",
                        desc: "Enable splitting bill between Cash, Card, EasyPaisa, or JazzCash",
                        icon: DollarSign,
                      },
                      {
                        key: "allowHoldSale" as const,
                        label: "Hold & Resume Transactions",
                        desc: "Allow cashiers to put busy carts on hold while attending next customer",
                        icon: Clock,
                      },
                      {
                        key: "allowCreditSales" as const,
                        label: "Credit Sales (Khata / Udhaar)",
                        desc: "Allow assigning sales to customer credit ledger for deferred payment",
                        icon: Users,
                      },
                      {
                        key: "requireRxUpload" as const,
                        label: "Mandatory Prescription Upload",
                        desc: "Enforce uploading doctor prescription for scheduled/narcotic drugs",
                        icon: FileText,
                      },
                    ].map(({ key, label, desc, icon: Icon }) => {
                      const enabled = permForm[key];
                      return (
                        <div
                          key={key}
                          className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="p-2 rounded-lg bg-gray-100 text-gray-600 mt-0.5 shrink-0">
                              <Icon size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{label}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => setPermForm((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none ${
                              enabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                            role="switch"
                            aria-checked={enabled}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                                enabled ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Changes take effect immediately upon saving.</span>
                    <Button onClick={savePermForm} size="sm">
                      <Check size={14} /> Save Permissions
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 4: APPEARANCE (THEMES)
               ══════════════════════════════════════════════════════════ */}
            {tab === "appearance" && (
              <div className="space-y-6">
                <Card>
                  <div className="p-6 pb-2 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                      <Palette size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Theme & Visual Styling</h2>
                      <p className="text-xs text-gray-500">
                        Choose your preferred brand accent and interface theme.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Theme Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {THEMES.map(({ key, label, swatch, previewBg }) => {
                        const isActive = settings.themeColor === key;
                        const bg = previewBg ?? swatch;
                        const isLight = (() => {
                          const r = parseInt(bg.slice(1, 3), 16);
                          const g = parseInt(bg.slice(3, 5), 16);
                          const b = parseInt(bg.slice(5, 7), 16);
                          return (r * 299 + g * 587 + b * 114) / 1000 > 180;
                        })();

                        return (
                          <div
                            key={key}
                            onClick={() => {
                              updateSettings({ themeColor: key });
                              toast.success(`Theme updated to ${label}`);
                            }}
                            className={`group relative flex flex-col items-center gap-2.5 p-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                              isActive
                                ? "border-blue-600 bg-blue-50/40 shadow-xs scale-102"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`w-12 h-12 rounded-xl shadow-xs flex items-center justify-center transition-transform group-hover:scale-105 ${
                                isLight ? "border border-gray-300" : ""
                              }`}
                              style={{ background: bg }}
                            >
                              {isActive && (
                                <Check
                                  size={20}
                                  strokeWidth={3}
                                  className={isLight ? "text-gray-800" : "text-white"}
                                />
                              )}
                            </div>
                            <span className={`text-xs font-semibold text-center truncate w-full ${
                              isActive ? "text-blue-900 font-bold" : "text-gray-700"
                            }`}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Component Preview */}
                    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-slate-50">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-500" /> Active Theme Elements Preview
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {THEMES.find((t) => t.key === settings.themeColor)?.label}
                        </span>
                      </div>
                      <div className="p-5 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl theme-sidebar-active text-xs font-semibold shadow-2xs">
                          <div className="w-2.5 h-2.5 bg-white/50 rounded-full" />
                          Sidebar Nav Active
                        </div>
                        <div className="px-4 py-2 rounded-xl theme-btn-primary text-xs font-semibold shadow-2xs">
                          Primary Action Button
                        </div>
                        <div className="px-3 py-1 rounded-full theme-badge text-xs font-bold">
                          Status Badge
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl text-xs font-semibold theme-tab-active shadow-2xs">
                          Active Tab Pill
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 5: EXPENSES MANAGEMENT
               ══════════════════════════════════════════════════════════ */}
            {tab === "expenses" && (
              <div className="space-y-6">
                {/* Form to log new expense */}
                <Card>
                  <div className="p-6 pb-2 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Record Operational Expense</h2>
                      <p className="text-xs text-gray-500">
                        Log rent, utility bills, staff salaries, and misc supplies for accurate profit reporting.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Expense Description *"
                        value={expForm.description}
                        onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                        placeholder="e.g. Electricity Bill Oct 2026"
                        required
                      />
                      <Input
                        label="Amount (PKR) *"
                        type="number"
                        min={1}
                        value={expForm.amount}
                        onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                        placeholder="e.g. 15000"
                        required
                      />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700">Category</label>
                        <select
                          value={expForm.category}
                          onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                          className={selectCls}
                        >
                          {["Utilities", "Salaries", "Rent", "Supplies", "Maintenance", "Transport", "Other"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Expense Date"
                        type="date"
                        value={expForm.date}
                        onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit">
                        <Plus size={16} /> Add Expense Entry
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Expense records table */}
                <Card padding={false}>
                  <div className="p-5 flex items-center justify-between border-b border-gray-100">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Logged Expenses</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {expenses.length} {expenses.length === 1 ? "entry" : "entries"} recorded
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <th className="px-5 py-3">Description</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-xs">
                              No expense records found.
                            </td>
                          </tr>
                        ) : (
                          [...expenses]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice((expensePage - 1) * PAGE_SIZE, expensePage * PAGE_SIZE)
                            .map((exp) => (
                              <tr key={exp.id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-5 py-3.5 font-semibold text-gray-900">{exp.description}</td>
                                <td className="px-5 py-3.5">
                                  <Badge>{exp.category}</Badge>
                                </td>
                                <td className="px-5 py-3.5 font-bold text-red-600 font-mono">
                                  {formatCurrency(exp.amount)}
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(exp.date)}</td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteExpense(exp.id);
                                      toast.success("Expense deleted");
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete expense"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={expensePage}
                    totalItems={expenses.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setExpensePage}
                    itemLabel="expenses"
                  />
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 6: USER & STAFF MANAGEMENT
               ══════════════════════════════════════════════════════════ */}
            {tab === "users" && (
              <div className="space-y-6">
                <Card padding={false}>
                  <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Staff & Operator Accounts</h2>
                        <p className="text-xs text-gray-500">
                          {users.length} registered {users.length === 1 ? "account" : "accounts"} with role assignments
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={openAddUser}>
                      <Plus size={16} /> Add User
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <th className="px-5 py-3">Staff Member</th>
                          <th className="px-5 py-3">Username</th>
                          <th className="px-5 py-3">Role</th>
                          <th className="px-5 py-3">Branch</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-xs">
                              No staff accounts added yet.
                            </td>
                          </tr>
                        ) : (
                          users
                            .slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE)
                            .map((u) => {
                            const initials = u.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase();

                            return (
                              <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                      {initials || "U"}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{u.name}</p>
                                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                                  @{u.username}
                                </td>
                                <td className="px-5 py-3.5">
                                  <Badge variant={ROLE_COLORS[u.role] ?? "default"}>{u.role}</Badge>
                                </td>
                                <td className="px-5 py-3.5 text-xs text-gray-500">{u.branch ?? "Main"}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                    u.isActive
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                                    {u.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditUser(u)}
                                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="Edit details"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateUser(u.id, { isActive: !u.isActive });
                                        toast.success(u.isActive ? "Account deactivated" : "Account activated");
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        u.isActive
                                          ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                          : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                      title={u.isActive ? "Deactivate" : "Activate"}
                                    >
                                      {u.isActive ? <Trash2 size={15} /> : <Check size={15} />}
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

                  <Pagination
                    currentPage={userPage}
                    totalItems={users.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setUserPage}
                    itemLabel="staff members"
                  />
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── User Add / Edit Modal ── */}
      <Modal
        isOpen={userModal}
        onClose={() => setUserModal(false)}
        title={editingUser ? "Edit Staff Account" : "Create New Staff Account"}
        size="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              placeholder="e.g. Ali Raza"
              required
            />
            <Input
              label="Username *"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              placeholder="aliraza"
              required
            />
            <Input
              label="Email Address *"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="ali@pharmacy.com"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Assigned Role *</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                className={selectCls}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <Input
              label="4-Digit Quick PIN"
              value={userForm.pin}
              onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="e.g. 1234"
              maxLength={4}
            />
            <Input
              label="Assigned Branch"
              value={userForm.branch}
              onChange={(e) => setUserForm({ ...userForm, branch: e.target.value })}
              placeholder="Main Branch"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="u-active"
              type="checkbox"
              checked={userForm.isActive}
              onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
            />
            <label htmlFor="u-active" className="text-sm font-medium text-gray-700 cursor-pointer">
              User account is active & permitted to log in
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" className="flex-1" onClick={() => setUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingUser ? "Save Changes" : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
