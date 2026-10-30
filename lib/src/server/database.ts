import { mysql } from "@aicore-fivem/mysql";
import { createLogger } from "../shared";

const log = createLogger("aicore-lib");

interface TableStatement {
  table: string;
  sql: string;
  columns: Map<string, string>;
}

const CREATE_TABLE =
  /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([A-Za-z0-9_]+)`?\s*\(/i;
const NON_COLUMN_LINE =
  /^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|FOREIGN|FULLTEXT|SPATIAL|CHECK)\b/i;

function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "");
}

/** Splits a table body on commas that are not inside parentheses or quotes. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";

  for (const char of body) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === "`") {
      quote = char;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
    } else if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseStatement(sql: string): TableStatement | null {
  const match = CREATE_TABLE.exec(sql);
  if (!match?.[1]) return null;

  const open = sql.indexOf("(");
  const close = sql.lastIndexOf(")");
  const columns = new Map<string, string>();

  for (const part of splitTopLevel(sql.slice(open + 1, close))) {
    if (NON_COLUMN_LINE.test(part)) continue;
    const name = /^`?([A-Za-z0-9_]+)`?/.exec(part)?.[1];
    if (name) columns.set(name.toLowerCase(), part);
  }

  return { table: match[1], sql, columns };
}

async function existingColumns(table: string): Promise<Set<string> | null> {
  const rows = await mysql.query<{ COLUMN_NAME: string }[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  if (!rows || rows.length === 0) return null;
  return new Set(rows.map((row) => row.COLUMN_NAME.toLowerCase()));
}

/**
 * Creates missing tables and adds missing columns from a resource's sql file (`file` is a path inside
 * `resource`). Never drops, renames or modifies existing columns and never adds keys to existing tables.
 * Waits for the database connection first.
 */
export async function createDatabaseTables(
  resource: string,
  file: string,
): Promise<void> {
  await mysql.awaitConnection();
  const content = LoadResourceFile(resource, file);
  if (!content) throw new Error(`${resource}/${file} not found`);

  const statements = stripComments(content)
    .split(/;\s*$/m)
    .map((sql) => sql.trim())
    .filter(Boolean);

  for (const sql of statements) {
    const statement = parseStatement(sql);
    if (!statement) {
      log.warn(
        `${resource}/${file}: skipped statement (only CREATE TABLE IF NOT EXISTS is applied)`,
      );
      continue;
    }

    const columns = await existingColumns(statement.table);
    if (!columns) {
      await mysql.query(statement.sql);
      log.info(`^2created table ${statement.table}^7 (${resource})`);
      continue;
    }

    for (const [name, definition] of statement.columns) {
      if (columns.has(name)) continue;
      await mysql.query(
        `ALTER TABLE \`${statement.table}\` ADD COLUMN ${definition}`,
      );
      log.info(`^2added column ${statement.table}.${name}^7 (${resource})`);
    }
  }
}
