#!/usr/bin/env bun
/**
 * Database types from the resource's own tables: reads every `CREATE TABLE` in `sql/main.sql` and writes
 * `resource/server/tables.ts` with each table's row type (what a SELECT returns through @aicore-fivem/mysql) and its
 * insert type (columns with a default, NULL or AUTO_INCREMENT may be left out). The SQL file stays the one source of
 * truth: change it, build, and every query written with `typedDb<Tables, TableInserts>()` is checked against it.
 *
 * Usage (package.json build script, before tsdown): aicore-db-types [sql/main.sql] [resource/server/tables.ts]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface Column {
  name: string;
  /** TypeScript type of the value a SELECT returns. */
  ts: string;
  optionalOnInsert: boolean;
}

interface Table {
  name: string;
  columns: Column[];
}

/** SQL type -> the value @aicore-fivem/mysql returns (same as oxmysql: dates as epoch ms, TINYINT(1) as boolean). */
function tsType(sqlType: string): string {
  const t = sqlType.toLowerCase().trim();
  const base = t.replace(/\s+unsigned|\s+zerofill/g, "");
  if (/^tinyint\(1\)/.test(base) || /^bool(ean)?\b/.test(base) || /^bit\(1\)/.test(base)) return "boolean";
  if (/^bigint\b/.test(base)) return "number | string";
  if (/^(tinyint|smallint|mediumint|int|integer|float|double|real|year)\b/.test(base)) return "number";
  if (/^(decimal|numeric|dec|fixed)\b/.test(base)) return "string";
  if (/^(date|datetime|timestamp)\b/.test(base)) return "number";
  if (/^enum\s*\(/.test(base)) {
    const values = [...sqlType.matchAll(/'((?:[^']|'')*)'/g)].map((m) => JSON.stringify((m[1] ?? "").replace(/''/g, "'")));
    return values.length > 0 ? values.join(" | ") : "string";
  }
  if (/^(binary|varbinary|tinyblob|blob|mediumblob|longblob)\b/.test(base)) return "number[]";
  return "string";
}

/** The body between the first `(` after a CREATE TABLE and its matching `)`, split on top-level commas. */
function definitions(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (const ch of body) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Every `CREATE TABLE` of a SQL file (comments stripped). */
export function parseTables(sql: string): Table[] {
  const clean = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const tables: Table[] = [];
  const head = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?(\w+)[`"]?\s*\(/gi;
  for (let m = head.exec(clean); m; m = head.exec(clean)) {
    let depth = 1;
    let i = head.lastIndex;
    for (; i < clean.length && depth > 0; i++) {
      if (clean[i] === "(") depth++;
      else if (clean[i] === ")") depth--;
    }
    const columns: Column[] = [];
    for (const def of definitions(clean.slice(head.lastIndex, i - 1))) {
      if (/^(primary|unique|key|index|constraint|foreign|check|fulltext|spatial)\b/i.test(def)) continue;
      const col = /^[`"]?(\w+)[`"]?\s+(\w+(?:\s*\([^)]*\))?(?:\s+unsigned)?(?:\s+zerofill)?)/i.exec(def);
      if (!col?.[1] || !col[2]) continue;
      const rest = def.slice(col[0].length).toLowerCase();
      const notNull = /\bnot\s+null\b/.test(rest);
      const optionalOnInsert = !notNull || /\bdefault\b/.test(rest) || /\bauto_increment\b/.test(rest);
      const ts = tsType(col[2]);
      columns.push({ name: col[1], ts: notNull ? ts : `${ts} | null`, optionalOnInsert });
    }
    tables.push({ name: m[1] ?? "", columns });
  }
  return tables;
}

/** The generated module: `Tables` (rows) and `TableInserts` (insert shapes). */
export function renderTables(tables: Table[], source: string): string {
  const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name));
  const rows = tables.map((t) => `  ${t.name}: {\n${t.columns.map((c) => `    ${key(c.name)}: ${c.ts};`).join("\n")}\n  };`);
  const inserts = tables.map(
    (t) => `  ${t.name}: {\n${t.columns.map((c) => `    ${key(c.name)}${c.optionalOnInsert ? "?" : ""}: ${c.ts};`).join("\n")}\n  };`,
  );
  return `// Generated from ${source} by aicore-db-types (the build runs it). Do not edit: change the SQL and build.

/** Row of each table as @aicore-fivem/mysql returns it. */
export type Tables = {
${rows.join("\n")}
};

/** What an INSERT needs: columns with a default, NULL or AUTO_INCREMENT may be left out. */
export type TableInserts = {
${inserts.join("\n")}
};
`;
}

if (import.meta.main) {
  const [sqlPath = "sql/main.sql", outPath = "resource/server/tables.ts"] = process.argv.slice(2);
  if (!existsSync(sqlPath)) process.exit(0);
  const next = renderTables(parseTables(readFileSync(sqlPath, "utf8")), sqlPath);
  if (!existsSync(outPath) || readFileSync(outPath, "utf8") !== next) writeFileSync(outPath, next);
}
