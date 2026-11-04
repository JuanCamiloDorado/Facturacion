import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { listQuerySchema, sedeSchema, sedeUpdateSchema } from "../../shared/schemas";
import { sedes } from "../db/tenant-schema";
import { activeFilter, contains } from "../lib/filters";
import { notFound, validate } from "../lib/http";
import { requireAuth, requireRole } from "../lib/session";
import type { AppEnv } from "../types";

export const sedeRoutes = new Hono<AppEnv>()
  .use(requireAuth, requireRole("admin"))
  .get("/", validate("query", listQuerySchema), async (c) => {
    const { q, active, limit } = c.req.valid("query");
    const rows = await c.var.db
      .select()
      .from(sedes)
      .where(and(activeFilter(sedes.active, active), q ? contains(sedes.name, q) : undefined))
      .orderBy(asc(sedes.name))
      .limit(limit);
    return c.json(rows);
  })
  .post("/", validate("json", sedeSchema), async (c) => {
    const input = c.req.valid("json");
    const [row] = await c.var.db
      .insert(sedes)
      .values({ ...input, id: crypto.randomUUID(), createdAt: new Date() })
      .returning();
    return c.json(row, 201);
  })
  .patch("/:id", validate("json", sedeUpdateSchema), async (c) => {
    const [row] = await c.var.db
      .update(sedes)
      .set(c.req.valid("json"))
      .where(eq(sedes.id, c.req.param("id")))
      .returning();
    return row ? c.json(row) : notFound("La sede");
  });
