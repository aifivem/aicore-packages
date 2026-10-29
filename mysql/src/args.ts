/*
 * Argument handling that matches oxmysql, so scripts written for it behave the same: named `@name` / `:name`
 * placeholders, Lua tables with holes (objects with numeric keys), missing values padded with NULL, undefined sent
 * as NULL. Adapted from oxmysql (https://github.com/overextended/oxmysql, LGPL-3.0, Overextended).
 */
import { namedPlaceholders } from "./config";

export type Params = unknown[] | Record<string, unknown> | null | undefined;

const IDENT = /[A-Za-z0-9_]/;

/** Replaces `@name` / `:name` outside quotes with `?` and returns the values in order (missing ones as NULL). */
function convertNamed(query: string, params: Record<string, unknown>): [string, unknown[]] | null {
  const values: unknown[] = [];
  let out = "";
  let quote: string | null = null;
  let found = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i] as string;
    if (quote) {
      out += char;
      if (char === "\\") out += query[++i] ?? "";
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      out += char;
      continue;
    }
    if ((char === "@" || char === ":") && IDENT.test(query[i + 1] ?? "") && query[i - 1] !== ":" && query[i + 1] !== "=") {
      let end = i + 1;
      while (end < query.length && IDENT.test(query[end] as string)) end++;
      const name = query.slice(i + 1, end);
      const value = params[name] ?? params[`@${name}`] ?? params[`:${name}`];
      values.push(value === undefined ? null : value);
      out += "?";
      found = true;
      i = end - 1;
      continue;
    }
    out += char;
  }
  return found ? [out, values] : null;
}

const placeholderCount = (query: string): number => query.match(/\?(?!\?)/g)?.length ?? 0;

/** `query` / `single` / `scalar` / `insert` / `update` arguments as `[sql, values]`. */
export function parseArguments(query: unknown, params: Params): [string, unknown[]] {
  if (typeof query !== "string") throw new Error(`Expected query to be a string but received ${typeof query} instead.`);
  let sql = query;
  let values: unknown;

  if (namedPlaceholders && params && typeof params === "object" && !Array.isArray(params) && (sql.includes(":") || sql.includes("@"))) {
    const converted = convertNamed(sql, params);
    if (converted) [sql, values] = converted;
  }
  values ??= params;
  if (!values || typeof values !== "object") values = [];

  const count = placeholderCount(sql);
  if (!Array.isArray(values)) {
    const record = values as Record<string, unknown>;
    values = Array.from({ length: count }, (_, i) => record[i + 1] ?? null);
  }
  const list = (values as unknown[]).map((value) => (value === undefined ? null : value));
  if (count > list.length) list.push(...Array.from({ length: count - list.length }, () => null));
  else if (count && count < list.length) throw new Error(`Expected ${count} parameters, but received ${list.length}.`);
  return [sql, list];
}

/** `prepare` / `rawExecute` arguments: one value list per run (a batch when several are given). */
export function parseExecute(query: string, params: unknown): unknown[][] {
  const count = query.split("?").length - 1;
  if (!params || typeof params !== "object") return [];
  let list: unknown[] = Array.isArray(params)
    ? params
    : Object.entries(params as Record<string, unknown>).reduce<unknown[]>((arr, [key, value]) => {
        arr[Number(key) - 1] = value;
        return arr;
      }, []);

  if (!list.every(Array.isArray)) {
    list = list.every((item) => typeof item === "object" && item !== null)
      ? list.map((item) =>
          Array.isArray(item)
            ? item
            : Object.entries(item as Record<string, unknown>).reduce<unknown[]>((arr, [key, value]) => {
                arr[Number(key) - 1] = value;
                return arr;
              }, []),
        )
      : [list];
  }
  return (list as unknown[][]).map((values) => {
    const row = Array.from({ length: Math.max(count, values.length) }, (_, i) => values[i] ?? null);
    return row;
  });
}

/** The statement kind `prepare` unpacks by: INSERT gives the id, UPDATE/DELETE the affected rows. */
export function executeType(query: string): "insert" | "update" | null {
  switch (query.substring(0, query.indexOf(" ")).toUpperCase()) {
    case "INSERT":
      return "insert";
    case "UPDATE":
    case "DELETE":
      return "update";
    default:
      return null;
  }
}

export interface TransactionStep {
  sql: string;
  values: unknown[];
}

/** Transaction queries in every shape oxmysql accepts: strings, `[sql, params]` pairs, `{ query, values|parameters }`. */
export function parseTransaction(queries: unknown, params: Params): TransactionStep[] {
  if (!Array.isArray(queries)) throw new Error(`Transaction queries must be array, received '${typeof queries}'.`);
  const shared = params && typeof params === "object" ? params : [];
  return queries.map((entry: unknown) => {
    if (Array.isArray(entry)) {
      if (typeof entry[1] !== "object") throw new Error(`Transaction parameters must be array or object, received '${typeof entry[1]}'.`);
      const [sql, values] = parseArguments(entry[0], entry[1] as Params);
      return { sql, values };
    }
    if (typeof entry === "object" && entry !== null && "query" in entry) {
      const step = entry as { query: unknown; values?: Params; parameters?: Params };
      const [sql, values] = parseArguments(step.query, step.parameters ?? step.values);
      return { sql, values };
    }
    const [sql, values] = parseArguments(entry, shared);
    return { sql, values };
  });
}
