declare namespace Cloudflare {
  interface Env {
    TENANT_OTRO: D1Database;
    CONTROL_MIGRATIONS: import("cloudflare:test").D1Migration[];
    TENANT_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
