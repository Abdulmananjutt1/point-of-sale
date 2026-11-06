const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  role:  "admin" | "cashier";
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
    } catch {
      throw new Error("Cannot connect to server. Please ensure the backend is running on port 5000.");
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? "Invalid email or password");
    return json.data as { token: string; user: AuthUser };
  },

  saveToken(token: string, role?: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token",    token);
      if (role) localStorage.setItem("userRole", role);
      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      document.cookie = `userRole=${role ?? "cashier"}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  },

  // Save full user info after login
  saveUser(user: AuthUser) {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  },

  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userRole");
  },

  // Get saved user object
  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  },

  // Get user ID from JWT payload
  getUserId(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1])).id ?? null;
    } catch { return null; }
  },

  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("currentUser");
      document.cookie = "token=; path=/; max-age=0";
      document.cookie = "userRole=; path=/; max-age=0";
    }
  },
};
