import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // Un segundo cliente solo para probar que los datos no se cruzan.
        d1Databases: { TENANT_OTRO: "local-pos-tenant-otro" },
        bindings: {
          CONTROL_MIGRATIONS: await readD1Migrations("./migrations/control"),
          TENANT_MIGRATIONS: await readD1Migrations("./migrations/tenant"),
        },
      },
    })),
  ],
  test: {
    include: ["test/**/*.spec.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
