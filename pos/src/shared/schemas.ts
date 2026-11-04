import { z } from "zod";
import { DOC_TYPES, PERSON_TYPES, ROLES, TAX_TYPES, TAXES_WITH_RATE } from "./constants";

// Validaciones compartidas entre la API y los formularios.

const requiredText = (max: number) =>
  z.string().trim().min(1, "Este campo es obligatorio").max(max, `Máximo ${max} caracteres`);

// Los formularios envían "" cuando un campo opcional queda vacío.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullish();

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email("Correo inválido").nullable())
  .nullish();

const email = z.string().trim().toLowerCase().pipe(z.email("Correo inválido"));
const id = z.string().min(1);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const sedeSchema = z.object({
  name: requiredText(80),
  address: optionalText(160),
  phone: optionalText(30),
  legalName: optionalText(160),
  nit: z
    .string()
    .trim()
    .regex(/^\d{0,15}$/, "El NIT solo lleva números, sin el dígito de verificación")
    .transform((v) => (v === "" ? null : v))
    .nullish(),
});
export const sedeUpdateSchema = sedeSchema.partial().extend({ active: z.boolean().optional() });

const password = z.string().min(8, "Mínimo 8 caracteres").max(128);

export const userCreateSchema = z.object({
  name: requiredText(80),
  email,
  role: z.enum(ROLES),
  password,
  sedeIds: z.array(id).default([]),
});
export const userUpdateSchema = z.object({
  name: requiredText(80).optional(),
  email: email.optional(),
  role: z.enum(ROLES).optional(),
  password: password.optional(),
  sedeIds: z.array(id).optional(),
  active: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: requiredText(80),
  description: optionalText(300),
});
export const categoryUpdateSchema = categorySchema.partial().extend({ active: z.boolean().optional() });

const productFields = z.object({
  name: requiredText(120),
  categoryId: id,
  code: optionalText(40),
  description: optionalText(500),
  price: z.number().int("El precio va en pesos, sin decimales").min(0).max(100_000_000),
  taxType: z.enum(TAX_TYPES),
  taxRate: z.number().int().min(0).max(10_000),
});

export function taxRateMatchesType(p: { taxType?: (typeof TAX_TYPES)[number]; taxRate?: number }) {
  if (p.taxType === undefined || p.taxRate === undefined) return true;
  return TAXES_WITH_RATE.includes(p.taxType) ? p.taxRate > 0 : p.taxRate === 0;
}
const taxRateIssue = {
  error: "La tarifa debe ser mayor que 0 para INC o IVA, y 0 para los demás",
  path: ["taxRate"],
};

export const productSchema = productFields.refine(taxRateMatchesType, taxRateIssue);
export const productUpdateSchema = productFields
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(taxRateMatchesType, taxRateIssue);

const NUMERIC_DOCS = ["CC", "NIT", "TI"];

const customerFields = z.object({
  docType: z.enum(DOC_TYPES),
  docNumber: z.string().trim().min(3, "Número muy corto").max(20).regex(/^[A-Za-z0-9]+$/, "Sin puntos ni guiones"),
  personType: z.enum(PERSON_TYPES),
  name: requiredText(160),
  email: optionalEmail,
  phone: optionalText(30),
  address: optionalText(160),
  city: optionalText(80),
});

export function docNumberMatchesType(c: { docType?: string; docNumber?: string }) {
  if (!c.docType || !c.docNumber) return true;
  return !NUMERIC_DOCS.includes(c.docType) || /^\d+$/.test(c.docNumber);
}
const docNumberIssue = { error: "Este tipo de documento solo lleva números", path: ["docNumber"] };

export const customerSchema = customerFields.refine(docNumberMatchesType, docNumberIssue);
export const customerUpdateSchema = customerFields
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(docNumberMatchesType, docNumberIssue);

export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  active: z.enum(["true", "false", "all"]).default("true"),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type LoginInput = z.input<typeof loginSchema>;
export type SedeInput = z.input<typeof sedeSchema>;
export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type ProductInput = z.input<typeof productSchema>;
export type CustomerInput = z.input<typeof customerSchema>;
