/**
 * ai-core's database API for TypeScript resources. Each resource runs its own small pool in-process (no export hop
 * per query); results have the same types oxmysql returns (dates as epoch ms, TINYINT(1) as boolean, DECIMAL as
 * string). Queries reject on failure; `transaction` resolves false after a rollback.
 *
 *   import { mysql } from "@aicore-fivem/mysql";
 *   const row = await mysql.single<{ id: number }>("SELECT id FROM t WHERE name = ?", [name]);
 */
import type { Params } from "./args";
import { runExecute, runQuery, runStartTransaction, runTransaction, type TransactionQuery } from "./engine";
import { emitError, errorText } from "./log";
import { closePool, getPool, isReady, setPoolSize } from "./pool";
import { typedDb } from "./typed";
import { recordError } from "./stats";

const resource = GetCurrentResourceName();

/** Rejects with the oxmysql-style message (query included) and lets error listeners know. */
function failWith(sql: unknown) {
  return (error: unknown): never => {
    emitError(resource, error, typeof sql === "string" ? sql : undefined);
    throw new Error(errorText(resource, error, typeof sql === "string" ? sql : undefined), { cause: error });
  };
}

export type TransactionInput = string[] | [string, Params][] | { query: string; values?: Params; parameters?: Params }[];

export const mysql = {
  isReady,
  /** Resolves once the pool answered (opens it if needed). */
  awaitConnection: (): Promise<true> => getPool().then(() => true as const),
  /** Rows for SELECT, the result header for writes. */
  query: <T = unknown>(sql: string, params?: Params): Promise<T> => runQuery(resource, null, sql, params).catch(failWith(sql)) as Promise<T>,
  /** First row or null. */
  single: <T = Record<string, unknown>>(sql: string, params?: Params): Promise<T | null> =>
    runQuery(resource, "single", sql, params).catch(failWith(sql)) as Promise<T | null>,
  /** First column of the first row, or null. */
  scalar: <T = unknown>(sql: string, params?: Params): Promise<T | null> =>
    runQuery(resource, "scalar", sql, params).catch(failWith(sql)) as Promise<T | null>,
  /** The insert id, or null. */
  insert: (sql: string, params?: Params): Promise<number | null> => runQuery(resource, "insert", sql, params).catch(failWith(sql)) as Promise<number | null>,
  /** Affected rows, or null. */
  update: (sql: string, params?: Params): Promise<number | null> => runQuery(resource, "update", sql, params).catch(failWith(sql)) as Promise<number | null>,
  /** Prepared statement; an array of value lists runs it once per list. SELECT answers its first row only. */
  prepare: <T = unknown>(sql: string, params?: unknown): Promise<T> => runExecute(resource, sql, params, true).catch(failWith(sql)) as Promise<T>,
  /** Prepared statement with raw results. */
  rawExecute: <T = unknown>(sql: string, params?: unknown): Promise<T> => runExecute(resource, sql, params, false).catch(failWith(sql)) as Promise<T>,
  /** All statements on one connection: true when committed, false after a rollback (the error is printed). */
  transaction: (queries: TransactionInput, params?: Params): Promise<boolean> =>
    runTransaction(resource, queries, params).catch((error: unknown) => {
      recordError();
      console.error(`${resource} was unable to complete a transaction!\n${error instanceof Error ? error.message : String(error)}`);
      return false;
    }),
  /** Queries on one connection inside `work`; return false to roll back. True when committed. */
  startTransaction: (work: (query: TransactionQuery) => Promise<boolean | void>): Promise<boolean> =>
    runStartTransaction(work).catch((error: unknown) => {
      console.error(errorText(resource, error));
      return false;
    }),
  setPoolSize,
  close: closePool,
};

/**
 * Typed table access on the resource's generated `resource/server/tables.ts`:
 * `const db = tables<Tables, TableInserts>(); await db.select("ai_core_users", ["id"], { fivem })`.
 */
export const tables = <T extends Record<string, Record<string, unknown>>, I extends { [K in keyof T]: Record<string, unknown> }>() => typedDb<T, I>(mysql);

export type { Params, TransactionQuery };
export type { SelectOptions } from "./typed";
export { collectQueryStats, type QueryRecord, type QueryStatsSnapshot } from "./stats";
