import { createPool, type Pool } from "mysql2/promise";
import { isolationStatement, poolOptions } from "./config";

/**
 * One pool per resource (in-process: no export hop per query). Opened on first use. While the database cannot be
 * reached, every query waits (as with oxmysql) and the connection is retried with a growing delay (2 s up to 30 s).
 * Pool size: `setPoolSize` before the first query, else the `ai_mysql_pool_size` convar (5).
 */
let pool: Pool | null = null;
let pending: Promise<Pool> | null = null;
let size: number | null = null;
let closed = false;

export function setPoolSize(connections: number): void {
  size = Math.max(1, Math.floor(connections));
}

const resource = GetCurrentResourceName();
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** One connection attempt: the pool when the server answers, null otherwise (the reason is printed). */
async function attempt(): Promise<Pool | null> {
  const created = createPool(
    poolOptions(size ?? GetConvarInt("ai_mysql_pool_size", 5)),
  );
  const isolation = isolationStatement();
  created.on("connection", (connection) => {
    connection.query(isolation);
  });
  try {
    const [rows] = await created.query("SELECT VERSION() AS version");
    const version = Array.isArray(rows)
      ? (rows[0] as { version?: string } | undefined)?.version
      : undefined;
    console.log(
      `^5[${version ?? "?"}]^0 ^2${resource} connected to the database^0`,
    );
    return created;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "?";
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `^1${resource} could not connect to the database (${code}): ${message}^0`,
    );
    await created.end().catch(() => undefined);
    return null;
  }
}

async function open(): Promise<Pool> {
  for (let delay = 2000; ; delay = Math.min(delay * 2, 30_000)) {
    const created = await attempt();
    if (created) {
      pool = created;
      return created;
    }
    if (closed)
      throw new Error(
        `${resource} stopped before the database connection was made`,
      );
    console.log(
      `^3${resource} queries wait for the database, next try in ${delay / 1000} s^0`,
    );
    await wait(delay);
  }
}

/** The pool; queries made before the database answers wait here until it does. */
export function getPool(): Promise<Pool> {
  if (pool) return Promise.resolve(pool);
  pending ??= open();
  return pending;
}

export function isReady(): boolean {
  return pool !== null;
}

/** Closes the pool (resource stop); queued queries finish first. */
export async function closePool(): Promise<void> {
  closed = true;
  const current = pool;
  pool = null;
  pending = null;
  await current?.end();
}
