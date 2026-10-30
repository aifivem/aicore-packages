/*
 * Connection settings read the way oxmysql reads them, so an existing server.cfg keeps working.
 * Parsing adapted from oxmysql (https://github.com/overextended/oxmysql, LGPL-3.0, Overextended).
 */
import type { PoolOptions, TypeCastField, TypeCastNext } from "mysql2";
import { typeCast } from "./typeCast";

export const slowQueryWarning = (): number =>
  GetConvarInt("mysql_slow_query_warning", 200);
export const resultSetWarning = (): number =>
  GetConvarInt("mysql_resultset_warning", 1000);

const ISOLATION: Record<number, string> = {
  1: "REPEATABLE READ",
  2: "READ COMMITTED",
  3: "READ UNCOMMITTED",
  4: "SERIALIZABLE",
};

/** The statement every new pool connection runs (oxmysql default: READ COMMITTED). */
export function isolationStatement(): string {
  return `SET TRANSACTION ISOLATION LEVEL ${ISOLATION[GetConvarInt("mysql_transaction_isolation_level", 2)] ?? "READ COMMITTED"}`;
}

function parseUri(
  connection: string,
): Record<string, string | number | undefined> {
  const match = connection.match(
    /^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([\w\d\-Ā-￿.%]*)(?::([0-9]+))?)?([^?#]+)?(?:\?([^#]*))?$/,
  );
  if (!match)
    throw new Error("mysql_connection_string has an invalid structure");
  const [user, password] = match[2] ? match[2].split(":") : [];
  const options: Record<string, string | number | undefined> = {
    user: user ? decodeURIComponent(user) : undefined,
    password: password ? decodeURIComponent(password) : undefined,
    host: match[3],
    port: match[4] ? Number(match[4]) : undefined,
    database: match[5]?.replace(/^\/+/, ""),
  };
  for (const pair of (match[6] ?? "").split("&")) {
    const [key, value] = pair.split("=");
    if (key) options[key] = value;
  }
  return options;
}

function parseKeyValue(connection: string): Record<string, string> {
  const options: Record<string, string> = {};
  const normalized = connection
    .replace(
      /(?:host(?:name)|ip|server|data\s?source|addr(?:ess)?)=/gi,
      "host=",
    )
    .replace(/(?:user\s?(?:id|name)?|uid)=/gi, "user=")
    .replace(/(?:pwd|pass)=/gi, "password=")
    .replace(/(?:db)=/gi, "database=");
  for (const pair of normalized.split(";")) {
    const [key, value] = pair.split("=");
    if (key) options[key] = value ?? "";
  }
  return options;
}

/** Whether `@name` / `:name` placeholders are converted (on unless `namedPlaceholders=false` is in the string). */
export let namedPlaceholders = true;

/** mysql2 pool options from `mysql_connection_string` (URI or `key=value;` form). */
export function poolOptions(connectionLimit: number): PoolOptions {
  const connection =
    GetConvar("mysql_connection_string", "") || "mysql://root@localhost";
  const raw: Record<string, unknown> = connection.includes("mysql://")
    ? parseUri(connection)
    : parseKeyValue(connection);

  namedPlaceholders = raw.namedPlaceholders !== "false";
  delete raw.namedPlaceholders;

  for (const key of ["dateStrings", "flags", "ssl"]) {
    const value = raw[key];
    if (typeof value !== "string") continue;
    try {
      raw[key] = JSON.parse(value);
    } catch {
      console.log(
        `^3[mysql] could not parse option ${key} in mysql_connection_string^0`,
      );
    }
  }

  const flags = Array.isArray(raw.flags) ? (raw.flags as string[]) : [];
  flags.push(raw.database ? "CONNECT_WITH_DB" : "-CONNECT_WITH_DB");

  return {
    connectTimeout: 60_000,
    supportBigNumbers: true,
    jsonStrings: true,
    connectionLimit,
    maxIdle: Math.min(2, connectionLimit),
    idleTimeout: 60_000,
    ...raw,
    typeCast: typeCast as (field: TypeCastField, next: TypeCastNext) => unknown,
    namedPlaceholders: false,
    flags,
  };
}
