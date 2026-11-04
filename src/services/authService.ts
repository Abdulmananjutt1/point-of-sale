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

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  },

  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("userRole");
  },

  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      document.cookie = "token=; path=/; max-age=0";
      document.cookie = "userRole=; path=/; max-age=0";
    }
  },
};
