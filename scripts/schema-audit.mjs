// ------------------------------------------------------------------
//  Read-only schema audit for the Turso database.
//
//  `d:\New folder (2)` points at the same Turso database as the older
//  workspace at `D:\New folder`, so this database already contains tables
//  that the older app created. `CREATE TABLE IF NOT EXISTS` is silent about
//  a clash — it simply keeps the existing shape — which is why the shape
//  has to be read before anything new is declared.
//
//  Run:  node scripts/schema-audit.mjs
//  It only ever reads. No DDL, no writes.
// ------------------------------------------------------------------

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@libsql/client";

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, "..", ".env.local");

/** Read two keys out of .env.local without exporting the whole file. */
async function credentials() {
  const text = await readFile(envFile, "utf8");
  const pick = (key) =>
    text.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]+)"?`, "m"))?.[1] ?? "";

  const url = pick("TURSO_DATABASE_URL");
  const authToken = pick("TURSO_AUTH_TOKEN");

  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  }

  return { url, authToken };
}

const { url, authToken } = await credentials();
const db = createClient({ url, authToken });

// Table names only — the audit never needs to read a row's contents.
const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name",
);

console.log(`Database: ${new URL(url.replace("libsql://", "https://")).host}`);
console.log(`Tables: ${tables.rows.length}\n`);

for (const row of tables.rows) {
  const name = String(row.name);

  const columns = await db.execute(`PRAGMA table_info("${name}")`);
  const shape = columns.rows
    .map((column) => `${column.name} ${column.type || "—"}`)
    .join(", ");

  let count = "?";
  try {
    const result = await db.execute(`SELECT count(*) AS n FROM "${name}"`);
    count = String(result.rows[0].n);
  } catch {
    count = "denied";
  }

  console.log(`${name}  (${count} rows)`);
  console.log(`  ${shape}\n`);
}

db.close();
