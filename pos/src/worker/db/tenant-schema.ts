import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { DOC_TYPES, PERSON_TYPES, ROLES, TAX_TYPES } from "../../shared/constants";

// Esquema de la base de cada cliente. El dinero se guarda en pesos enteros.

const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull();
const active = () => integer("active", { mode: "boolean" }).notNull().default(true);

export const sedes = sqliteTable("sedes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  // Si la sede factura con otro NIT distinto al del cliente.
  legalName: text("legal_name"),
  nit: text("nit"),
  active: active(),
  createdAt: createdAt(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull(),
  active: active(),
  createdAt: createdAt(),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
});

export const userSedes = sqliteTable(
  "user_sedes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    sedeId: text("sede_id")
      .notNull()
      .references(() => sedes.id),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sedeId] })],
);

// El id es el SHA-256 del token de la cookie: si se filtra la base, no sirve para entrar.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = sqliteTable("login_attempts", {
  email: text("email").primaryKey(),
  failures: integer("failures").notNull(),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: active(),
  createdAt: createdAt(),
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    code: text("code").unique(),
    description: text("description"),
    // Precio final al público, con impuesto incluido.
    price: integer("price").notNull(),
    taxType: text("tax_type", { enum: TAX_TYPES }).notNull(),
    // Puntos básicos: 800 = 8 %.
    taxRate: integer("tax_rate").notNull(),
    active: active(),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    check("products_price_check", sql`price >= 0`),
    check("products_tax_rate_check", sql`tax_rate BETWEEN 0 AND 10000`),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    docType: text("doc_type", { enum: DOC_TYPES }).notNull(),
    docNumber: text("doc_number").notNull(),
    // Dígito de verificación, solo para NIT.
    dv: text("dv"),
    personType: text("person_type", { enum: PERSON_TYPES }).notNull(),
    // Nombre completo o razón social.
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    active: active(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customers_doc_idx").on(t.docType, t.docNumber), index("customers_name_idx").on(t.name)],
);

export type Sede = typeof sedes.$inferSelect;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
