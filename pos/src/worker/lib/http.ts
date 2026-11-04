import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType } from "zod";
import type { ApiErrorBody } from "../../shared/api-types";

type Target = "json" | "query" | "param";

export function validate<T extends ZodType, K extends Target>(target: K, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const body: ApiErrorBody = {
        error: "Revisa los datos del formulario",
        issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      };
      return c.json(body, 400);
    }
  });
}

export function notFound(what: string): never {
  throw new HTTPException(404, { message: `${what} no existe` });
}

// Nombres legibles para los errores de valores repetidos.
const UNIQUE_FIELDS: Record<string, string> = {
  "categories.name": "Ya existe una categoría con ese nombre",
  "products.name": "Ya existe un producto con ese nombre",
  "products.code": "Ya existe un producto con ese código",
  "customers.doc_type": "Ya existe un cliente con ese documento",
  "sedes.name": "Ya existe una sede con ese nombre",
  "users.email": "Ya existe un usuario con ese correo",
};

function errorChain(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(" | ");
}

export function handleError(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    const body: ApiErrorBody = { error: err.message };
    return c.json(body, err.status);
  }
  const message = errorChain(err);
  const unique = message.match(/UNIQUE constraint failed: ([\w.]+)/);
  if (unique) {
    const body: ApiErrorBody = { error: UNIQUE_FIELDS[unique[1]!] ?? "Ese valor ya existe" };
    return c.json(body, 409);
  }
  if (message.includes("FOREIGN KEY constraint failed")) {
    const body: ApiErrorBody = { error: "Uno de los datos relacionados no existe" };
    return c.json(body, 400);
  }
  console.error(err);
  const body: ApiErrorBody = { error: "Ocurrió un error inesperado. Intenta de nuevo" };
  return c.json(body, 500);
}
