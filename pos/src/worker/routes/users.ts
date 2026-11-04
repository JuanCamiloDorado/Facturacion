import { and, asc, count, eq, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { UserDto } from "../../shared/api-types";
import { listQuerySchema, userCreateSchema, userUpdateSchema } from "../../shared/schemas";
import { type User, userSedes, users } from "../db/tenant-schema";
import { activeFilter, contains } from "../lib/filters";
import { notFound, validate } from "../lib/http";
import { hashPassword } from "../lib/password";
import { requireAuth, requireRole, revokeUserSessions } from "../lib/session";
import type { AppEnv, TenantDb } from "../types";

function toDto(user: User, sedeIds: string[]): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    sedeIds,
  };
}

async function sedeIdsOf(db: TenantDb, userId: string) {
  const rows = await db.select({ sedeId: userSedes.sedeId }).from(userSedes).where(eq(userSedes.userId, userId));
  return rows.map((r) => r.sedeId);
}

async function otherActiveAdmins(db: TenantDb, userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true), ne(users.id, userId)));
  return row?.n ?? 0;
}

export const userRoutes = new Hono<AppEnv>()
  .use(requireAuth, requireRole("admin"))
  .get("/", validate("query", listQuerySchema), async (c) => {
    const { q, active, limit } = c.req.valid("query");
    const db = c.var.db;
    const rows = await db
      .select()
      .from(users)
      .where(and(activeFilter(users.active, active), q ? contains(users.name, q) : undefined))
      .orderBy(asc(users.name))
      .limit(limit);
    const links = await db.select().from(userSedes);
    const byUser = Map.groupBy(links, (l) => l.userId);
    return c.json(rows.map((u) => toDto(u, (byUser.get(u.id) ?? []).map((l) => l.sedeId))));
  })
  .post("/", validate("json", userCreateSchema), async (c) => {
    const { sedeIds, password, ...input } = c.req.valid("json");
    const db = c.var.db;
    const id = crypto.randomUUID();
    const user = { ...input, id, passwordHash: await hashPassword(password), createdAt: new Date() };
    await db.batch([
      db.insert(users).values(user),
      ...sedeIds.map((sedeId) => db.insert(userSedes).values({ userId: id, sedeId })),
    ]);
    const [created] = await db.select().from(users).where(eq(users.id, id));
    return c.json(toDto(created!, sedeIds), 201);
  })
  .patch("/:id", validate("json", userUpdateSchema), async (c) => {
    const { sedeIds, password, ...changes } = c.req.valid("json");
    const db = c.var.db;
    const id = c.req.param("id");
    const me = c.var.user;
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) notFound("El usuario");

    if (id === me.id && (changes.active === false || (changes.role && changes.role !== "admin"))) {
      throw new HTTPException(400, { message: "No puedes desactivarte ni quitarte el rol de administrador" });
    }
    const losesAdmin =
      existing.role === "admin" && existing.active && (changes.active === false || (changes.role && changes.role !== "admin"));
    if (losesAdmin && (await otherActiveAdmins(db, id)) === 0) {
      throw new HTTPException(400, { message: "Debe quedar al menos un administrador activo" });
    }

    const statements: BatchItem<"sqlite">[] = [];
    const update = { ...changes, ...(password ? { passwordHash: await hashPassword(password) } : {}) };
    if (Object.keys(update).length > 0) {
      statements.push(db.update(users).set(update).where(eq(users.id, id)));
    }
    if (sedeIds) {
      statements.push(db.delete(userSedes).where(eq(userSedes.userId, id)));
      statements.push(...sedeIds.map((sedeId) => db.insert(userSedes).values({ userId: id, sedeId })));
    }
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);

    // Al cambiar la contraseña o desactivar, se cierran sus otras sesiones.
    if (changes.active === false || password) {
      await revokeUserSessions(db, id, id === me.id ? me.sessionId : undefined);
    }

    const [updated] = await db.select().from(users).where(eq(users.id, id));
    return c.json(toDto(updated!, await sedeIdsOf(db, id)));
  });
