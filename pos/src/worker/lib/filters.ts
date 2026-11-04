import { type Column, eq, type SQL, sql } from "drizzle-orm";

export function activeFilter(column: Column, active: "true" | "false" | "all"): SQL | undefined {
  if (active === "all") return undefined;
  return eq(column, active === "true");
}

// Búsqueda por texto sin dejar que el usuario meta comodines de LIKE.
export function contains(column: Column, q: string): SQL {
  const pattern = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  return sql`${column} LIKE ${pattern} ESCAPE '\\'`;
}
