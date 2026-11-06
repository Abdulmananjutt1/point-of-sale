import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JwtPayload, AppError, ApiResponse } from "./types";
import { hasPermission, Permission } from "./permissions";

const JWT_SECRET = process.env.JWT_SECRET!;

// ─── Verify JWT from request ──────────────────────────────────────────────────
export function verifyToken(req: NextRequest): JwtPayload {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("No token provided", 401);
  }
  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

// ─── Require role ─────────────────────────────────────────────────────────────
export function requireRole(user: JwtPayload, ...roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new AppError("Access denied: insufficient permissions", 403);
  }
}

// ─── Require permission ───────────────────────────────────────────────────────
export function requirePermission(user: JwtPayload, permission: Permission): void {
  if (!hasPermission(user.role, user.permissions ?? [], permission)) {
    throw new AppError(`Access denied: missing permission '${permission}'`, 403);
  }
}

// ─── Centralized error → NextResponse ────────────────────────────────────────
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, message } satisfies ApiResponse, { status });
}

// ─── Wrap a route handler with error handling ─────────────────────────────────
type Handler = (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode);
      }
      console.error("[API Error]", err);
      return apiError("Internal server error", 500);
    }
  };
}
