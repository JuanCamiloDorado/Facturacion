import { and, asc, eq, getTableColumns, or } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ProductDto } from "../../shared/api-types";
import { listQuerySchema, productSchema, productUpdateSchema, taxRateMatchesType } from "../../shared/schemas";
import { categories, products } from "../db/tenant-schema";
import { activeFilter, contains } from "../lib/filters";
import { notFound, validate } from "../lib/http";
import { requireAuth, requireRole } from "../lib/session";
import type { AppEnv, TenantDb } from "../types";

const productListQuery = listQuerySchema.extend({ categoryId: z.string().optional() });

function selectProducts(db: TenantDb) {
  return db
    .select({ ...getTableColumns(products), categoryName: categories.name })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId));
}

async function findProduct(db: TenantDb, id: string): Promise<ProductDto> {
  const [row] = await selectProducts(db).where(eq(products.id, id)).limit(1);
  if (!row) notFound("El producto");
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export const productRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", validate("query", productListQuery), async (c) => {
    const { q, active, limit, categoryId } = c.req.valid("query");
    const rows = await selectProducts(c.var.db)
      .where(
        and(
          activeFilter(products.active, active),
          categoryId ? eq(products.categoryId, categoryId) : undefined,
          q ? or(contains(products.name, q), contains(products.code, q)) : undefined,
        ),
      )
      .orderBy(asc(products.name))
      .limit(limit);
    return c.json(rows);
  })
  .post("/", requireRole("admin"), validate("json", productSchema), async (c) => {
    const now = new Date();
    const id = crypto.randomUUID();
    await c.var.db.insert(products).values({ ...c.req.valid("json"), id, createdAt: now, updatedAt: now });
    return c.json(await findProduct(c.var.db, id), 201);
  })
  .patch("/:id", requireRole("admin"), validate("json", productUpdateSchema), async (c) => {
    const id = c.req.param("id");
    const changes = c.req.valid("json");
    const existing = await findProduct(c.var.db, id);
    const merged = { taxType: changes.taxType ?? existing.taxType, taxRate: changes.taxRate ?? existing.taxRate };
    if (!taxRateMatchesType(merged)) {
      throw new HTTPException(400, { message: "La tarifa debe ser mayor que 0 para INC o IVA, y 0 para los demás" });
    }
    await c.var.db
      .update(products)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(products.id, id));
    return c.json(await findProduct(c.var.db, id));
  });
