import { and, eq, gt, ne } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Role } from "../../shared/constants";
import { sessions, users } from "../db/tenant-schema";
import type { AppEnv, AuthUser, TenantDb } from "../types";

export const SESSION_COOKIE = "pos_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function writeCookie(c: Context<AppEnv>, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function startSession(c: Context<AppEnv>, userId: string) {
  const token = randomToken();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  await c.var.db.insert(sessions).values({
    id: await sha256Hex(token),
    userId,
    expiresAt,
    createdAt: new Date(now),
  });
  writeCookie(c, token, expiresAt);
}

export async function endSession(c: Context<AppEnv>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.var.db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function revokeUserSessions(db: TenantDb, userId: string, exceptSessionId?: string) {
  const sameUser = eq(sessions.userId, userId);
  await db.delete(sessions).where(exceptSessionId ? and(sameUser, ne(sessions.id, exceptSessionId)) : sameUser);
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) throw new HTTPException(401, { message: "Inicia sesión para continuar" });

  const sessionId = await sha256Hex(token);
  const now = Date.now();
  const [row] = await c.var.db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date(now)), eq(users.active, true)))
    .limit(1);

  if (!row) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    throw new HTTPException(401, { message: "Tu sesión terminó. Inicia sesión de nuevo" });
  }

  // Sesión deslizante: si se usa a diario, no vence.
  if (row.expiresAt.getTime() - now < SESSION_TTL_MS - RENEW_AFTER_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await c.var.db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
    writeCookie(c, token, expiresAt);
  }

  const user: AuthUser = { id: row.id, name: row.name, email: row.email, role: row.role, sessionId };
  c.set("user", user);
  await next();
});

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.var.user.role)) {
      throw new HTTPException(403, { message: "No tienes permiso para hacer esto" });
    }
    await next();
  });
}
