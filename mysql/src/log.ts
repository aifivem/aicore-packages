import { resultSetWarning, slowQueryWarning } from "./config";
import { debugEnabled, recordError, recordQuery } from "./stats";

/** Slow and oversized queries in the console, with the resource that ran them (oxmysql's convars and format). */
export function logQuery(resource: string, sql: string, ms: number, values: unknown, rows: unknown): void {
  recordQuery(sql, ms);
  if (ms >= slowQueryWarning() || debugEnabled()) {
    console.log(`^3${resource} took ${ms.toFixed(4)}ms to execute a query!\n${sql} ${JSON.stringify(values)}^0`);
  }
  const length = Array.isArray(rows) ? rows.length : 0;
  if (length >= resultSetWarning()) {
    console.warn(`${resource} executed a query with an oversized result set (${length} results)!\n${sql}`);
  }
}

/** The text oxmysql prints (and hands to promise callers) when a query fails. */
export function errorText(resource: string, error: unknown, sql?: string, values?: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${resource} was unable to execute a query!${sql ? `\nQuery: ${sql}` : ""}${values ? `\n${JSON.stringify(values)}` : ""}\n${message}`;
}

/** Counts the failure and lets listeners (logging scripts) see it, as oxmysql does. */
export function emitError(resource: string, error: unknown, sql?: string, values?: unknown): void {
  recordError();
  const message = error instanceof Error ? error.message : String(error);
  emit("oxmysql:error", { query: sql, parameters: values, message, resource });
}
