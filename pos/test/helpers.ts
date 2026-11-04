import { exports } from "cloudflare:workers";
import { expect } from "vitest";
import { ADMIN_EMAIL, TENANTS } from "./setup";

type TenantSlug = keyof typeof TENANTS | (string & {});

interface ApiOptions {
  tenant?: TenantSlug;
  cookie?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api(path: string, opts: ApiOptions = {}) {
  const origin = `http://${opts.tenant ?? "demo"}.localhost`;
  const headers: Record<string, string> = { Origin: origin, ...opts.headers };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  return exports.default.fetch(`${origin}/api${path}`, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

export function sessionCookie(res: Response): string {
  const header = res.headers.get("set-cookie") ?? "";
  const match = header.match(/pos_session=[^;]+/);
  expect(match, "la respuesta debería traer la cookie de sesión").not.toBeNull();
  return match![0];
}

export async function login(email: string, password: string, tenant: TenantSlug = "demo") {
  const res = await api("/auth/login", { tenant, body: { email, password } });
  expect(res.status).toBe(200);
  return sessionCookie(res);
}

export function loginAdmin(tenant: keyof typeof TENANTS = "demo") {
  return login(ADMIN_EMAIL, TENANTS[tenant].password, tenant);
}

let counter = 0;
export function unique(prefix: string) {
  counter += 1;
  return `${prefix} ${Date.now()}-${counter}`;
}

export async function createUser(adminCookie: string, role: string, password = "clave-segura-1") {
  const email = `${role}-${Date.now()}-${++counter}@prueba.co`;
  const res = await api("/users", {
    cookie: adminCookie,
    body: { name: `Usuario ${role}`, email, role, password },
  });
  expect(res.status).toBe(201);
  const user = (await res.json()) as { id: string };
  return { id: user.id, email, password, cookie: await login(email, password) };
}
