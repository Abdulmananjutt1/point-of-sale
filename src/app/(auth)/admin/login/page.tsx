"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Pill, BarChart3, Users, Package, AlertCircle, ArrowLeftRight } from "lucide-react";
import { authService } from "@/services/authService";
import { toastSuccess, toastApiError } from "@/lib/toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanInput = email.trim();
    const cleanPw = password.trim();

    if (!cleanInput || !cleanPw) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const emailVal = cleanInput.includes("@")
        ? cleanInput.toLowerCase()
        : `${cleanInput.toLowerCase()}@pharmapos.com`;

      const { token, user } = await authService.login(emailVal, cleanPw);

      if (user.role !== "admin") {
        setError("Access denied. Use the Cashier login for cashier accounts.");
        setLoading(false);
        return;
      }

      authService.saveToken(token, user.role);
      toastSuccess(`Welcome, ${user.name}!`);
      // Full redirect to guarantee cookies and state sync across middleware and dashboard
      window.location.href = "/";
    } catch (err) {
      toastApiError(err);
      setError(err instanceof Error ? err.message : "Invalid credentials.");
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("admin");
    setPassword("admin123");
    setError("");
  };

  const handleSwitchToCashier = () => {
    authService.removeToken();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 relative overflow-hidden">
      {/* Floating Decorative Elements - Top Right (pointer-events-none ensures zero click interference) */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-transparent rounded-full blur-3xl opacity-60 animate-pulse pointer-events-none select-none -z-0" />
      <div className="absolute top-32 right-20 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-transparent rounded-full blur-2xl opacity-40 animate-bounce pointer-events-none select-none -z-0" style={{ animationDuration: '4s' }} />
      
      {/* Floating Decorative Elements - Bottom Right (pointer-events-none ensures zero click interference) */}
      <div className="absolute bottom-0 right-16 w-80 h-80 bg-gradient-to-tl from-cyan-300/5 to-transparent rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none select-none -z-0" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-40 right-64 w-72 h-72 bg-gradient-to-tl from-blue-200/8 to-transparent rounded-full blur-2xl opacity-30 animate-bounce pointer-events-none select-none -z-0" style={{ animationDuration: '5s' }} />

      {/* LEFT — Premium Features (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800">
        {/* Decorative Background - Animated Blobs */}
        <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
          <div className="absolute top-1/3 -right-40 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-cyan-300 rounded-full blur-3xl opacity-30 animate-bounce" style={{ animationDuration: '4s' }} />
          <div className="absolute top-1/2 -left-32 w-64 h-64 bg-blue-300 rounded-full blur-2xl opacity-10 animate-pulse" style={{ animationDuration: '5s' }} />
        </div>

        <div className="relative z-10 space-y-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Pill size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PharmaPOS</h1>
              <p className="text-blue-200 text-xs font-semibold tracking-wide">ADMIN PORTAL</p>
            </div>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
              Manage Your<br />Pharmacy
            </h2>
            <p className="text-blue-100 text-base">Complete control over inventory, sales, staff, and analytics.</p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package, title: "Inventory" },
              { icon: BarChart3, title: "Analytics" },
              { icon: Users, title: "Staff Mgmt" },
              { icon: Pill, title: "Stock Check" },
            ].map(({ icon: Icon, title }, idx) => (
              <div 
                key={title} 
                className="bg-white/5 hover:bg-white/15 transition-all duration-300 rounded-lg p-3 border border-white/10 hover:border-white/30 hover:shadow-lg hover:-translate-y-1 group cursor-pointer"
                style={{ 
                  animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                }}
              >
                <Icon size={18} className="text-blue-300 mb-2 group-hover:text-blue-200 transition-colors" />
                <p className="text-white font-semibold text-sm group-hover:translate-x-0.5 transition-transform">{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-blue-200/50 text-xs">© 2026 PharmaPOS. Secure Admin Access.</p>
      </div>

      {/* RIGHT — Login Form (Elevated with relative z-10 for guaranteed clickability) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-sm relative z-10">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Pill size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PharmaPOS</span>
          </div>

          {/* Header */}
          <div className="mb-8 lg:mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg mb-3">
              <ShieldCheck size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">Admin Access</span>
            </div>
            <h1 className="text-3xl lg:text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-600 text-sm">Manage your pharmacy operations</p>
          </div>

          {/* Form Card (Elevated with relative z-20) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-7 relative z-20">
            {error && (
              <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username or Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="admin or admin@pharmapos.com"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Switch to Cashier - Matching design, 100% full button clickable */}
            <div className="mt-6 pt-6 border-t border-gray-200 relative z-30">
              <button
                type="button"
                onClick={handleSwitchToCashier}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 active:bg-gray-200/70 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm select-none group"
              >
                <ArrowLeftRight size={16} className="text-gray-500 group-hover:text-gray-700 transition-colors pointer-events-none shrink-0" />
                <span className="pointer-events-none">Switch to Cashier Login</span>
              </button>
            </div>

            {/* Demo Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 relative z-30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Demo Account</p>
                <span className="text-[11px] text-blue-600 font-medium">(Click to autofill)</span>
              </div>
              <div 
                onClick={fillDemoAccount}
                className="grid grid-cols-2 gap-3 text-xs cursor-pointer group select-none"
                title="Click to fill admin credentials"
              >
                <div className="bg-blue-50 group-hover:bg-blue-100/70 transition-colors rounded-lg px-3 py-2.5 border border-blue-200 pointer-events-none">
                  <p className="text-gray-500 font-bold mb-0.5">Username / Email</p>
                  <p className="font-mono font-bold text-gray-700">admin</p>
                </div>
                <div className="bg-blue-50 group-hover:bg-blue-100/70 transition-colors rounded-lg px-3 py-2.5 border border-blue-200 pointer-events-none">
                  <p className="text-gray-500 font-bold mb-0.5">Password</p>
                  <p className="font-mono font-bold text-gray-700">admin123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
