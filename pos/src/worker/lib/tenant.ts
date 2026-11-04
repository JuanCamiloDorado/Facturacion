import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { type Tenant, tenants } from "../db/control-schema";
import * as tenantSchema from "../db/tenant-schema";
import type { AppEnv } from "../types";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Cada cliente entra por su subdominio: <slug>.<BASE_DOMAIN>.
// Sin subdominio (por ejemplo, "localhost" en desarrollo) se usa DEFAULT_TENANT.
export function tenantSlugFromHost(host: string, baseDomain: string, defaultTenant: string): string | null {
  const hostname = host.split(":")[0]!.toLowerCase();
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (hostname.endsWith(suffix)) {
    const slug = hostname.slice(0, -suffix.length);
    return SLUG_PATTERN.test(slug) ? slug : null;
  }
  return defaultTenant || null;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { tenant: Tenant | null; expires: number }>();

async function findTenant(env: Env, slug: string): Promise<Tenant | null> {
  const hit = cache.get(slug);
  if (hit && hit.expires > Date.now()) return hit.tenant;
  const control = drizzle(env.CONTROL_DB);
  const [tenant] = await control.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  cache.set(slug, { tenant: tenant ?? null, expires: Date.now() + CACHE_TTL_MS });
  return tenant ?? null;
}

function tenantDatabase(env: Env, binding: string): D1Database | null {
  const candidate = (env as unknown as Record<string, unknown>)[binding];
  if (candidate && typeof (candidate as D1Database).prepare === "function") return candidate as D1Database;
  return null;
}

export const tenantMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const host = c.req.header("host") ?? new URL(c.req.url).host;
  const slug = tenantSlugFromHost(host, c.env.BASE_DOMAIN, c.env.DEFAULT_TENANT);
  const tenant = slug ? await findTenant(c.env, slug) : null;
  if (!tenant || tenant.status !== "active") {
    throw new HTTPException(404, { message: "Este negocio no existe o está suspendido" });
  }
  const d1 = tenantDatabase(c.env, tenant.dbBinding);
  if (!d1) {
    console.error(`El cliente ${tenant.slug} apunta al binding ${tenant.dbBinding}, que no está configurado`);
    throw new HTTPException(503, { message: "La base de datos de este negocio no está disponible" });
  }
  c.set("tenant", tenant);
  c.set("db", drizzle(d1, { schema: tenantSchema }));
  await next();
});
