// Prepara las bases locales con el cliente "demo" y datos de ejemplo.
// Se puede correr varias veces: si el cliente demo ya existe, no hace nada.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { executeSql, hashPassword, newId, queryJson, ROOT, sql, tenantRow, wrangler } from "./lib.mjs";

const seed = JSON.parse(readFileSync(join(ROOT, "scripts", "dev-seed.json"), "utf8"));
const local = { remote: false };

wrangler(["d1", "migrations", "apply", "pos-control", "--local"]);
wrangler(["d1", "migrations", "apply", "pos-tenant-demo", "--local"]);

if (queryJson("pos-control", "SELECT slug FROM tenants WHERE slug = 'demo'", local).length > 0) {
  console.log("\nEl cliente demo ya existe. Para empezar de cero, borra la carpeta .wrangler/state");
  process.exit(0);
}

const now = Date.now();
const statements = [];
const sedeIds = seed.sedes.map(() => newId());
seed.sedes.forEach((name, i) => {
  statements.push(`INSERT INTO sedes (id, name, active, created_at) VALUES (${sql(sedeIds[i])}, ${sql(name)}, 1, ${now})`);
});
for (const user of seed.users) {
  const id = newId();
  statements.push(
    `INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES (${sql(id)}, ${sql(user.name)}, ${sql(user.email)}, ${sql(hashPassword(seed.password))}, ${sql(user.role)}, 1, ${now})`,
  );
  if (user.role !== "admin") {
    statements.push(`INSERT INTO user_sedes (user_id, sede_id) VALUES (${sql(id)}, ${sql(sedeIds[0])})`);
  }
}
for (const [category, items] of Object.entries(seed.menu)) {
  const categoryId = newId();
  statements.push(`INSERT INTO categories (id, name, active, created_at) VALUES (${sql(categoryId)}, ${sql(category)}, 1, ${now})`);
  for (const [name, price] of items) {
    statements.push(
      `INSERT INTO products (id, name, category_id, price, tax_type, tax_rate, active, created_at, updated_at) VALUES (${sql(newId())}, ${sql(name)}, ${sql(categoryId)}, ${price}, 'INC', 800, 1, ${now}, ${now})`,
    );
  }
}
statements.push(
  `INSERT INTO customers (id, doc_type, doc_number, person_type, name, active, created_at) VALUES (${sql(newId())}, 'CC', '222222222222', 'natural', 'Consumidor final', 1, ${now})`,
);

executeSql("pos-tenant-demo", statements, local);
executeSql("pos-control", [tenantRow({ slug: "demo", name: seed.tenantName, binding: "TENANT_DEMO" })], local);

console.log("\n✓ Cliente demo listo. Corre npm run dev y entra con los usuarios de scripts/dev-seed.json");
