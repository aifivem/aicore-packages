import { performance } from "node:perf_hooks";
import type { FieldPacket, PoolConnection } from "mysql2/promise";
import { executeType, parseArguments, parseExecute, parseTransaction, type Params } from "./args";
import { logQuery } from "./log";
import { getPool } from "./pool";
import { fixBlobs, shapeResult, type QueryType } from "./result";
import { typeCastExecute } from "./typeCast";

/**
 * The query core every entry point uses. Each call throws on failure; the callers decide how failures surface
 * (our TS API rethrows, the oxmysql-compatible exports follow oxmysql's callback rules).
 */

const resourceName = GetCurrentResourceName();

/** Wakes this resource right away so the promise continuation of a finished query runs without waiting a tick. */
const wake = (): void => ScheduleResourceTick(resourceName);

async function textQuery(conn: PoolConnection | null, sql: string, values: unknown[]): Promise<unknown> {
  wake();
  const target = conn ?? (await getPool());
  const [result, fields] = await target.query(sql, values);
  fixBlobs(result, fields as FieldPacket[] | undefined);
  return result;
}

export async function runQuery(resource: string, type: QueryType, query: unknown, params: Params): Promise<unknown> {
  const [sql, values] = parseArguments(query, params);
  const started = performance.now();
  const result = await textQuery(null, sql, values);
  logQuery(resource, sql, performance.now() - started, values, result);
  return shapeResult(type, result);
}

/**
 * Prepared statements (binary protocol). Several value lists run the statement once each. `unpack` shapes each
 * result like `prepare` does: INSERT → id, UPDATE/DELETE → affected rows, SELECT → first row (or its only value).
 */
export async function runExecute(resource: string, query: unknown, params: unknown, unpack: boolean): Promise<unknown> {
  if (typeof query !== "string") throw new Error(`Expected query to be a string but received ${typeof query} instead.`);
  const type = executeType(query);
  const batches = parseExecute(query, params);
  const pool = await getPool();
  const results: unknown[] = [];

  for (const values of batches.length ? batches : [[]]) {
    wake();
    const started = performance.now();
    const [result, fields] = await pool.execute({ sql: query, values, typeCast: typeCastExecute });
    fixBlobs(result, fields as FieldPacket[] | undefined);
    logQuery(resource, query, performance.now() - started, values, result);
    if (!unpack) results.push(result);
    else if (type) results.push(shapeResult(type, result));
    else {
      const row: unknown = Array.isArray(result) ? result[0] : null;
      const keys = row && typeof row === "object" ? Object.keys(row) : [];
      results.push(keys.length === 1 ? (row as Record<string, unknown>)[keys[0] as string] : (row ?? null));
    }
  }
  return results.length === 1 ? results[0] : results;
}

/** Every step on one connection; commits when all succeed, rolls back and throws otherwise. */
export async function runTransaction(resource: string, queries: unknown, params: Params): Promise<true> {
  const steps = parseTransaction(queries, params);
  const conn = await (await getPool()).getConnection();
  try {
    await conn.beginTransaction();
    for (const step of steps) {
      const started = performance.now();
      const result = await textQuery(conn, step.sql, step.values);
      logQuery(resource, step.sql, performance.now() - started, step.values, result);
    }
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

export type TransactionQuery = (sql: string, params?: Params) => Promise<unknown>;

/**
 * An interactive transaction: `work` runs queries on one connection and returns false to roll back. Times out
 * after 30 s (queries after that throw). Resolves true when committed.
 */
export async function runStartTransaction(work: (query: TransactionQuery) => Promise<boolean | void>): Promise<boolean> {
  const conn = await (await getPool()).getConnection();
  let closed = false;
  const timer = setTimeout(() => (closed = true), 30_000);
  try {
    await conn.beginTransaction();
    const commit = await work(async (query, params) => {
      if (closed) throw new Error("Transaction has timed out after 30 seconds.");
      const [sql, values] = parseArguments(query, params);
      return textQuery(conn, sql, values);
    });
    if (closed) throw new Error("Transaction has timed out after 30 seconds.");
    if (commit === false) {
      await conn.rollback();
      return false;
    }
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    closed = true;
    conn.release();
  }
}
