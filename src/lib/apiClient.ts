/**
 * Central API client — sab HTTP calls yahan se jaati hain.
 * - 401 aane pe token clear karke login page pe redirect
 * - Validation errors (422) ko single message mein combine karta hai
 */

// In development: /api (relative — Next.js serves its own API routes)
// In production: set NEXT_PUBLIC_API_URL to your domain if needed
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function getHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleUnauthorized() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; max-age=0";
    window.location.href = "/login";
  }
}

// Shared response parser — har method yahi use karta hai
async function parseResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Invalid or expired token");
  }

  if (!res.ok) {
    // Agar backend ne validation errors array bheja ho toh pehli wali dikhao
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      throw new Error(json.errors[0] as string);
    }
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  return json.data as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : "";

  const res = await fetch(`${BASE}${path}${qs}`, { headers: getHeaders() });
  return parseResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  await parseResponse<void>(res);
}
