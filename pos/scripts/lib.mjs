import { spawnSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyEdits, modify, parse } from "jsonc-parser";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONFIG_PATH = join(ROOT, "wrangler.jsonc");
const WRANGLER = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Mismo formato que src/worker/lib/password.ts.
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return `pbkdf2$100000$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function randomPassword() {
  return randomBytes(12).toString("base64url");
}

export const newId = () => randomUUID();

export function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "boolean") return String(Number(value));
  return `'${String(value).replaceAll("'", "''")}'`;
}

// Se llama a wrangler con node directamente (sin shell) para que no haya problemas de comillas en Windows.
export function wrangler(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [WRANGLER, ...args], {
    cwd: ROOT,
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const detail = capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`Falló: wrangler ${args.join(" ")}${detail}`);
  }
  return result.stdout ?? "";
}

export function locationFlags({ remote }) {
  return remote ? ["--remote", "--env", "production"] : ["--local"];
}

export function executeSql(databaseName, statements, location) {
  const dir = mkdtempSync(join(tmpdir(), "pos-sql-"));
  const file = join(dir, "seed.sql");
  writeFileSync(file, `${statements.join(";\n")};\n`);
  wrangler(["d1", "execute", databaseName, ...locationFlags(location), "--file", file]);
}

export function queryJson(databaseName, query, location) {
  const out = wrangler(["d1", "execute", databaseName, ...locationFlags(location), "--command", query, "--json"], {
    capture: true,
  });
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  return parsed[0]?.results ?? [];
}

export function readConfig() {
  const text = readFileSync(CONFIG_PATH, "utf8");
  return { text, config: parse(text) };
}

export function d1Databases(envName) {
  const { config } = readConfig();
  return (envName ? config.env?.[envName]?.d1_databases : config.d1_databases) ?? [];
}

export function addD1Database(envName, entry) {
  const { text } = readConfig();
  const list = d1Databases(envName);
  const path = envName ? ["env", envName, "d1_databases", list.length] : ["d1_databases", list.length];
  const edits = modify(text, path, entry, {
    isArrayInsertion: true,
    formattingOptions: { insertSpaces: true, tabSize: 2 },
  });
  writeFileSync(CONFIG_PATH, applyEdits(text, edits));
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      i++;
    }
  }
  return args;
}

// Datos iniciales de la base de un cliente nuevo.
export function tenantSeed({ adminName, adminEmail, adminPassword, sedeName }) {
  const now = Date.now();
  return [
    `INSERT INTO users (id, name, email, password_hash, role, active, created_at) VALUES (${sql(newId())}, ${sql(adminName)}, ${sql(adminEmail.toLowerCase())}, ${sql(hashPassword(adminPassword))}, 'admin', 1, ${now})`,
    `INSERT INTO sedes (id, name, active, created_at) VALUES (${sql(newId())}, ${sql(sedeName)}, 1, ${now})`,
    `INSERT INTO customers (id, doc_type, doc_number, person_type, name, active, created_at) VALUES (${sql(newId())}, 'CC', '222222222222', 'natural', 'Consumidor final', 1, ${now})`,
  ];
}

export function tenantRow({ slug, name, binding }) {
  return `INSERT INTO tenants (id, slug, name, db_binding, status, created_at) VALUES (${sql(newId())}, ${sql(slug)}, ${sql(name)}, ${sql(binding)}, 'active', ${Date.now()})`;
}
