import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { MeResponse } from "../../shared/api-types";
import { loginSchema } from "../../shared/schemas";
import { loginAttempts, sedes, userSedes, users } from "../db/tenant-schema";
import { validate } from "../lib/http";
import { hashPassword, verifyPassword } from "../lib/password";
import { endSession, requireAuth, startSession } from "../lib/session";
import type { AppEnv, AuthUser, TenantDb } from "../types";

const MAX_FAILURES = 10;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

async function assertNotLocked(db: TenantDb, email: string) {
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.email, email)).limit(1);
  if (row && row.failures >= MAX_FAILURES && row.windowStart.getTime() > Date.now() - LOCK_WINDOW_MS) {
    throw new HTTPException(429, { message: "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo" });
  }
}

async function registerFailure(db: TenantDb, email: string) {
  const now = new Date();
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.email, email)).limit(1);
  const windowExpired = !row || row.windowStart.getTime() <= now.getTime() - LOCK_WINDOW_MS;
  await db
    .insert(loginAttempts)
    .values({ email, failures: 1, windowStart: now })
    .onConflictDoUpdate({
      target: loginAttempts.email,
      set: windowExpired ? { failures: 1, windowStart: now } : { failures: row.failures + 1 },
    });
}

export async function sedesForUser(db: TenantDb, user: Pick<AuthUser, "id" | "role">) {
  if (user.role === "admin") {
    return db.select({ id: sedes.id, name: sedes.name }).from(sedes).where(eq(sedes.active, true)).orderBy(asc(sedes.name));
  }
  return db
    .select({ id: sedes.id, name: sedes.name })
    .from(userSedes)
    .innerJoin(sedes, eq(sedes.id, userSedes.sedeId))
    .where(and(eq(userSedes.userId, user.id), eq(sedes.active, true)))
    .orderBy(asc(sedes.name));
}

export const authRoutes = new Hono<AppEnv>()
  .post("/login", validate("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const db = c.var.db;
    await assertNotLocked(db, email);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // Si el correo no existe se calcula un hash igual, para no revelar qué correos existen por el tiempo de respuesta.
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
    if (!user || !passwordOk || !user.active) {
      await registerFailure(db, email);
      throw new HTTPException(401, { message: "Correo o contraseña incorrectos" });
    }

    await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await startSession(c, user.id);

    const body: MeResponse = {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tenant: { slug: c.var.tenant.slug, name: c.var.tenant.name },
      sedes: await sedesForUser(db, user),
    };
    return c.json(body);
  })
  .post("/logout", async (c) => {
    await endSession(c);
    return c.json({ ok: true });
  })
  .get("/me", requireAuth, async (c) => {
    const { id, name, email, role } = c.var.user;
    const body: MeResponse = {
      user: { id, name, email, role },
      tenant: { slug: c.var.tenant.slug, name: c.var.tenant.name },
      sedes: await sedesForUser(c.var.db, c.var.user),
    };
    return c.json(body);
  });
