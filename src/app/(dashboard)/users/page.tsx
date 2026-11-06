"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Edit2, ShieldCheck, User, RefreshCw,
  Eye, EyeOff, Search, CheckCircle2, Mail, Lock,
  UserCheck, UserX, Crown, MoreVertical, Sparkles,
  CalendarDays, Activity, Shield,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { toastSuccess, toastApiError } from "@/lib/toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AppUser {
  id: string; name: string; email: string;
  role: "admin" | "cashier"; isActive: boolean;
  permissions: string[]; createdAt: string;
}
interface UserForm { name: string; email: string; password: string; role: "admin" | "cashier"; }
const EMPTY: UserForm = { name: "", email: "", password: "", role: "cashier" };

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = "md" }: { user: AppUser; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} rounded-2xl flex items-center justify-center font-bold shrink-0 ${
      user.role === "admin" ? "bg-gradient-to-br from-red-400 to-rose-600 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 text-white"
    }`}>
      {user.name[0]?.toUpperCase() ?? "U"}
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: "admin" | "cashier" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      role === "admin"
        ? "bg-red-100 text-red-700"
        : "bg-emerald-100 text-emerald-700"
    }`}>
      {role === "admin" ? <Crown size={10} /> : <User size={10} />}
      {role === "admin" ? "Admin" : "Cashier"}
    </span>
  );
}

// ── Status Dot ────────────────────────────────────────────────────────────────
function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-600" : "text-gray-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const router    = useRouter();
  const { isAdmin } = usePermissions();

  useEffect(() => { if (!isAdmin) router.replace("/"); }, [isAdmin, router]);

  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Modals
  const [createModal,  setCreateModal]  = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmData,  setConfirmData]  = useState<{ type: "toggle" | "delete"; user: AppUser } | null>(null);
  const [editTarget,   setEditTarget]   = useState<AppUser | null>(null);

  // Forms
  const [form,       setForm]       = useState<UserForm>(EMPTY);
  const [editForm,   setEditForm]   = useState<UserForm>(EMPTY);
  const [showPw,     setShowPw]     = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  const [currentUserId, setCurrentUserId] = useState("");
  useEffect(() => {
    const id = authService.getUserId();
    if (id) setCurrentUserId(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await apiGet<AppUser[]>("/auth/users");
      setUsers(Array.isArray(raw) ? raw : []);
    } catch (err) { toastApiError(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Create ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/auth/register", {
        name: form.name,
        email: form.email.includes("@") ? form.email : `${form.email}@pharmapos.com`,
        password: form.password,
        role: form.role,
      });
      toastSuccess(`User "${form.name}" created!`);
      setCreateModal(false);
      setForm(EMPTY);
      load();
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  // ── Edit ──
  const openEdit = (user: AppUser) => {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email, password: "", role: user.role });
    setEditModal(true);
    setOpenMenu(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Partial<UserForm> = { name: editForm.name, email: editForm.email, role: editForm.role };
      if (editForm.password) payload.password = editForm.password;
      await apiPut(`/auth/users/${editTarget.id}`, payload);
      toastSuccess("User updated!");
      setEditModal(false);
      setEditTarget(null);
      load();
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  // ── Confirm action (toggle / delete) ──
  const handleConfirm = async () => {
    if (!confirmData) return;
    setSaving(true);
    try {
      if (confirmData.type === "toggle") {
        await apiPut(`/auth/users/${confirmData.user.id}`, { isActive: !confirmData.user.isActive });
        toastSuccess(confirmData.user.isActive ? "User deactivated" : "User activated");
      } else {
        await apiDelete(`/auth/users/${confirmData.user.id}`);
        toastSuccess("User deactivated");
      }
      setConfirmModal(false);
      setConfirmData(null);
      load();
    } catch (err) { toastApiError(err); }
    finally { setSaving(false); }
  };

  const filtered  = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = users.filter((u) => u.isActive).length;
  const adminCount    = users.filter((u) => u.role === "admin").length;
  const cashierCount  = users.filter((u) => u.role === "cashier").length;

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title="User Management" />

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* ── KPI Banner ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users",   value: users.length,    icon: Users,       gradient: "from-blue-500 to-indigo-600" },
            { label: "Admins",        value: adminCount,      icon: Crown,       gradient: "from-red-500 to-rose-600" },
            { label: "Cashiers",      value: cashierCount,    icon: User,        gradient: "from-emerald-500 to-teal-600" },
            { label: "Active",        value: activeCount,     icon: Activity,    gradient: "from-violet-500 to-purple-600" },
          ].map(({ label, value, icon: Icon, gradient }) => (
            <div key={label} className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon size={15} />
                </div>
              </div>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">All Users</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {users.length} users</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder="Search by name or email…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={load} disabled={loading}
              className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <Button size="sm" onClick={() => { setForm(EMPTY); setCreateModal(true); }}>
              <Plus size={14} /> Add User
            </Button>
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 animate-pulse last:border-0">
                <div className="w-10 h-10 bg-gray-100 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-36" />
                  <div className="h-3 bg-gray-100 rounded w-52" />
                </div>
                <div className="h-6 bg-gray-100 rounded-full w-16" />
                <div className="h-6 bg-gray-100 rounded-full w-14" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-200" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium">No users found</p>
            {search && <p className="text-sm text-gray-400 mt-1">Try clearing the search filter</p>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="w-10" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">User</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {filtered.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    className={`flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-start sm:items-center gap-3 sm:gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors ${
                      !user.isActive ? "opacity-55" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <Avatar user={user} />

                    {/* Name + email */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                        {isSelf && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                    </div>

                    {/* Role */}
                    <RoleBadge role={user.role} />

                    {/* Status */}
                    <StatusDot active={user.isActive} />

                    {/* Date */}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(user.createdAt), "dd MMM yyyy")}
                    </span>

                    {/* Actions dropdown */}
                    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu((v) => v === user.id ? null : user.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {openMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 py-1.5 overflow-hidden">
                          <button
                            onClick={() => openEdit(user)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Edit2 size={14} className="text-gray-400" /> Edit Profile
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => {
                                setConfirmData({ type: "toggle", user });
                                setConfirmModal(true);
                                setOpenMenu(null);
                              }}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                user.isActive
                                  ? "text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {user.isActive
                                ? <><UserX size={14} /> Deactivate</>
                                : <><UserCheck size={14} /> Activate</>
                              }
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); setForm(EMPTY); setShowPw(false); }}
        title="Add New User"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={saving}>
              <Plus size={13} /> Create User
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name" placeholder="e.g. Ali Hassan"
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            leftIcon={<User size={14} />} required
          />
          <Input
            label="Email" type="email" placeholder="user@pharmapos.com"
            value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            leftIcon={<Mail size={14} />} required
          />
          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPw ? "text" : "password"}
                className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min 6 characters"
                value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6} required
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(["cashier", "admin"] as const).map((r) => (
                <button
                  key={r} type="button" onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                    form.role === r
                      ? r === "admin"
                        ? "border-red-400 bg-red-50"
                        : "border-emerald-400 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    form.role === r
                      ? r === "admin" ? "bg-red-100" : "bg-emerald-100"
                      : "bg-gray-100"
                  }`}>
                    {r === "admin"
                      ? <Crown size={16} className={form.role === r ? "text-red-600" : "text-gray-400"} />
                      : <User size={16} className={form.role === r ? "text-emerald-600" : "text-gray-400"} />
                    }
                  </div>
                  <span className={`text-sm font-semibold ${
                    form.role === r
                      ? r === "admin" ? "text-red-700" : "text-emerald-700"
                      : "text-gray-400"
                  }`}>
                    {r === "admin" ? "Admin" : "Cashier"}
                  </span>
                  <span className="text-[10px] text-gray-400 text-center px-2">
                    {r === "admin" ? "Full system access" : "POS & sales only"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {form.role === "admin" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
              <Shield size={13} className="shrink-0 mt-0.5" />
              Admin users have full access including user management, settings, and reports.
            </div>
          )}
        </form>
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal
        isOpen={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null); setShowEditPw(false); }}
        title={editTarget ? `Edit — ${editTarget.name}` : "Edit User"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleEdit} isLoading={saving}>
              <CheckCircle2 size={13} /> Save Changes
            </Button>
          </div>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            {/* User preview card */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Avatar user={editTarget} />
              <div>
                <p className="font-semibold text-gray-800 text-sm">{editTarget.name}</p>
                <RoleBadge role={editTarget.role} />
              </div>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <Input
                label="Full Name" value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                leftIcon={<User size={14} />} required
              />
              <Input
                label="Email" type="email" value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                leftIcon={<Mail size={14} />} required
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  New Password <span className="font-normal text-gray-400">(blank = no change)</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showEditPw ? "text" : "password"}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank to keep current password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowEditPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showEditPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {editTarget.id !== currentUserId && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cashier", "admin"] as const).map((r) => (
                      <button
                        key={r} type="button" onClick={() => setEditForm((f) => ({ ...f, role: r }))}
                        className={`py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                          editForm.role === r
                            ? r === "admin" ? "border-red-400 bg-red-50 text-red-700" : "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {r === "admin" ? <Crown size={14} /> : <User size={14} />}
                        {r === "admin" ? "Admin" : "Cashier"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </Modal>

      {/* ── Confirm Modal (toggle / delete) ── */}
      <Modal
        isOpen={confirmModal}
        onClose={() => { setConfirmModal(false); setConfirmData(null); }}
        title={confirmData?.type === "toggle"
          ? confirmData.user.isActive ? "Deactivate User" : "Activate User"
          : "Remove User"
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmModal(false)}>Cancel</Button>
            <Button
              variant={confirmData?.user.isActive ? "danger" : "primary"}
              onClick={handleConfirm}
              isLoading={saving}
            >
              {confirmData?.type === "toggle"
                ? confirmData.user.isActive
                  ? <><UserX size={13} /> Deactivate</>
                  : <><UserCheck size={13} /> Activate</>
                : <><UserX size={13} /> Remove</>
              }
            </Button>
          </div>
        }
      >
        {confirmData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Avatar user={confirmData.user} />
              <div>
                <p className="font-semibold text-sm text-gray-800">{confirmData.user.name}</p>
                <p className="text-xs text-gray-400">{confirmData.user.email}</p>
              </div>
              <RoleBadge role={confirmData.user.role} />
            </div>
            <p className="text-sm text-gray-600">
              {confirmData.type === "toggle"
                ? confirmData.user.isActive
                  ? "This user will be deactivated and won't be able to log in until reactivated."
                  : "This user will be reactivated and can log in again."
                : "This user will be deactivated."
              }
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
