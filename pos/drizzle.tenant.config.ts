import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/worker/db/tenant-schema.ts",
  out: "./migrations/tenant",
});
