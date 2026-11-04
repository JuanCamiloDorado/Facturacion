import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { hashPassword } from "../src/worker/lib/password";

// Dos clientes de prueba con el mismo correo de administrador y contraseñas distintas,
// para comprobar que cada uno vive en su propia base.
export const TENANTS = {
  demo: { binding: "TENANT_DEMO", db: env.TENANT_DEMO!, password: "demo-admin-123" },
  otro: { binding: "TENANT_OTRO", db: env.TENANT_OTRO, password: "otro-admin-456" },
} as const;

export const ADMIN_EMAIL = "admin@prueba.co";

await applyD1Migrations(env.CONTROL_DB, env.CONTROL_MIGRATIONS);

for (const [slug, t] of Object.entries(TENANTS)) {
  await applyD1Migrations(t.db, env.TENANT_MIGRATIONS);
  await env.CONTROL_DB.prepare(
    "INSERT OR IGNORE INTO tenants (id, slug, name, db_binding, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
  )
    .bind(`tenant-${slug}`, slug, `Restaurante ${slug}`, t.binding, Date.now())
    .run();
  await t.db
    .prepare(
      "INSERT OR IGNORE INTO users (id, name, email, password_hash, role, active, created_at) VALUES ('admin', 'Admin', ?, ?, 'admin', 1, ?)",
    )
    .bind(ADMIN_EMAIL, await hashPassword(t.password), Date.now())
    .run();
}

await env.CONTROL_DB.prepare(
  "INSERT OR IGNORE INTO tenants (id, slug, name, db_binding, status, created_at) VALUES ('tenant-off', 'suspendido', 'Suspendido', 'TENANT_OFF', 'suspended', ?)",
)
  .bind(Date.now())
  .run();
