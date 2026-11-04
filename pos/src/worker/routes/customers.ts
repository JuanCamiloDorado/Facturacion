import { and, asc, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { nitCheckDigit } from "../../shared/nit";
import { customerSchema, customerUpdateSchema, docNumberMatchesType, listQuerySchema } from "../../shared/schemas";
import { customers } from "../db/tenant-schema";
import { activeFilter, contains } from "../lib/filters";
import { notFound, validate } from "../lib/http";
import { requireAuth, requireRole } from "../lib/session";
import type { AppEnv } from "../types";

function checkDigitFor(docType: string, docNumber: string) {
  return docType === "NIT" ? nitCheckDigit(docNumber) : null;
}

export const customerRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", validate("query", listQuerySchema), async (c) => {
    const { q, active, limit } = c.req.valid("query");
    const rows = await c.var.db
      .select()
      .from(customers)
      .where(
        and(
          activeFilter(customers.active, active),
          q ? or(contains(customers.name, q), contains(customers.docNumber, q)) : undefined,
        ),
      )
      .orderBy(asc(customers.name))
      .limit(limit);
    return c.json(rows);
  })
  .post("/", requireRole("admin", "cajero"), validate("json", customerSchema), async (c) => {
    const input = c.req.valid("json");
    const [row] = await c.var.db
      .insert(customers)
      .values({
        ...input,
        id: crypto.randomUUID(),
        dv: checkDigitFor(input.docType, input.docNumber),
        createdAt: new Date(),
      })
      .returning();
    return c.json(row, 201);
  })
  .patch("/:id", requireRole("admin", "cajero"), validate("json", customerUpdateSchema), async (c) => {
    const id = c.req.param("id");
    const changes = c.req.valid("json");
    const db = c.var.db;
    const [existing] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!existing) notFound("El cliente");

    const docType = changes.docType ?? existing.docType;
    const docNumber = changes.docNumber ?? existing.docNumber;
    if (!docNumberMatchesType({ docType, docNumber })) {
      throw new HTTPException(400, { message: "Este tipo de documento solo lleva números" });
    }
    const [row] = await db
      .update(customers)
      .set({ ...changes, dv: checkDigitFor(docType, docNumber) })
      .where(eq(customers.id, id))
      .returning();
    return c.json(row);
  });
