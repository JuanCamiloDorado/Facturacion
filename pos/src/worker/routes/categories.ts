import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { categorySchema, categoryUpdateSchema, listQuerySchema } from "../../shared/schemas";
import { categories } from "../db/tenant-schema";
import { activeFilter, contains } from "../lib/filters";
import { notFound, validate } from "../lib/http";
import { requireAuth, requireRole } from "../lib/session";
import type { AppEnv } from "../types";

export const categoryRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", validate("query", listQuerySchema), async (c) => {
    const { q, active, limit } = c.req.valid("query");
    const rows = await c.var.db
      .select()
      .from(categories)
      .where(and(activeFilter(categories.active, active), q ? contains(categories.name, q) : undefined))
      .orderBy(asc(categories.name))
      .limit(limit);
    return c.json(rows);
  })
  .post("/", requireRole("admin"), validate("json", categorySchema), async (c) => {
    const [row] = await c.var.db
      .insert(categories)
      .values({ ...c.req.valid("json"), id: crypto.randomUUID(), createdAt: new Date() })
      .returning();
    return c.json(row, 201);
  })
  .patch("/:id", requireRole("admin"), validate("json", categoryUpdateSchema), async (c) => {
    const [row] = await c.var.db
      .update(categories)
      .set(c.req.valid("json"))
      .where(eq(categories.id, c.req.param("id")))
      .returning();
    return row ? c.json(row) : notFound("La categoría");
  });
