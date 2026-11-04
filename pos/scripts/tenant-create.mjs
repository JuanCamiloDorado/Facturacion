// Da de alta un cliente nuevo: crea su base D1, la registra en wrangler.jsonc,
// aplica las tablas, crea su administrador y lo inscribe en la base de control.
//
//   npm run tenant:create -- --slug lacasona --name "La Casona" --admin-email dueno@lacasona.co
//   npm run tenant:create -- --slug lacasona ... --remote     (producción)
import {
  addD1Database,
  d1Databases,
  executeSql,
  locationFlags,
  parseArgs,
  queryJson,
  randomPassword,
  SLUG_PATTERN,
  tenantRow,
  tenantSeed,
  wrangler,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const usage =
  'Uso: npm run tenant:create -- --slug <slug> --name "<nombre>" --admin-email <correo> [--admin-name "<nombre>"] [--sede "<sede>"] [--remote]';

const slug = String(args.slug ?? "");
const name = args.name;
const adminEmail = args["admin-email"];
if (!SLUG_PATTERN.test(slug) || typeof name !== "string" || typeof adminEmail !== "string") {
  console.error(usage);
  process.exit(1);
}

const remote = args.remote === true;
const location = { remote };
const envName = remote ? "production" : null;
const binding = `TENANT_${slug.toUpperCase().replaceAll("-", "_")}`;
const databaseName = `pos-tenant-${slug}`;

if (d1Databases(envName).some((d) => d.binding === binding)) {
  console.error(`El cliente "${slug}" ya está en wrangler.jsonc (${binding}).`);
  process.exit(1);
}

let databaseId = `local-${databaseName}`;
if (remote) {
  wrangler(["d1", "create", databaseName]);
  const list = JSON.parse(wrangler(["d1", "list", "--json"], { capture: true }));
  databaseId = list.find((d) => d.name === databaseName)?.uuid;
  if (!databaseId) throw new Error(`No se encontró el id de ${databaseName} después de crearla`);
}

addD1Database(envName, {
  binding,
  database_name: databaseName,
  database_id: databaseId,
  migrations_dir: "migrations/tenant",
});
console.log(`✓ ${binding} agregado a wrangler.jsonc`);

wrangler(["d1", "migrations", "apply", "pos-control", ...locationFlags(location)]);
wrangler(["d1", "migrations", "apply", databaseName, ...locationFlags(location)]);

const existing = queryJson("pos-control", `SELECT slug FROM tenants WHERE slug = '${slug}'`, location);
if (existing.length > 0) {
  console.error(`El slug "${slug}" ya está registrado en la base de control.`);
  process.exit(1);
}

const adminPassword = typeof args["admin-password"] === "string" ? args["admin-password"] : randomPassword();
executeSql(
  databaseName,
  tenantSeed({
    adminName: typeof args["admin-name"] === "string" ? args["admin-name"] : "Administrador",
    adminEmail,
    adminPassword,
    sedeName: typeof args.sede === "string" ? args.sede : "Sede principal",
  }),
  location,
);
executeSql("pos-control", [tenantRow({ slug, name, binding })], location);

console.log(`\n✓ Cliente "${name}" creado.`);
console.log(`  Administrador: ${adminEmail}`);
console.log(`  Contraseña:    ${adminPassword}   (guárdala; no se vuelve a mostrar)`);
console.log(
  remote
    ? "\n  Falta publicar para que el Worker vea la base nueva: npm run deploy"
    : `\n  Entra en http://${slug}.localhost:5173 con npm run dev`,
);
