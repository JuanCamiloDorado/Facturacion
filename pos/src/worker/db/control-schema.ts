import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Base central: un registro por cliente (tenant) y el binding D1 de su base.
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  dbBinding: text("db_binding").notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
