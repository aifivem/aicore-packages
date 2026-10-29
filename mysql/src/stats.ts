import { slowQueryWarning } from "./config";

/**
 * Query statistics of this resource's pool, for the admin tools (oxmysql's `mysql_ui` counterpart). Each resource
 * keeps its own numbers in memory; nothing is sent anywhere until an admin tool asks (`collectQueryStats`).
 * Values are never stored, only the SQL text.
 */
export interface QueryRecord {
  sql: string;
  ms: number;
  at: number;
  slow: boolean;
}

export interface QueryStatsSnapshot {
  resource: string;
  queries: number;
  totalMs: number;
  slow: number;
  errors: number;
  /** Most recent queries, newest last (at most `mysql_log_size`, default 100). */
  recent: QueryRecord[];
  /** Most recent slow queries, newest last (at most 50). */
  recentSlow: QueryRecord[];
}

const resource = GetCurrentResourceName();
const logSize = (): number => GetConvarInt("mysql_log_size", 100);

const totals = { queries: 0, totalMs: 0, slow: 0, errors: 0 };
const recent: QueryRecord[] = [];
const recentSlow: QueryRecord[] = [];

/** `mysql_debug`: true prints every query of every resource, a JSON list prints those resources only. */
let debugAll = false;
let debugList: string[] = [];
function readDebug(): void {
  const raw = GetConvar("mysql_debug", "false");
  debugAll = raw === "true";
  debugList = [];
  if (debugAll || raw === "false") return;
  try {
    const parsed: unknown = JSON.parse(raw);
    debugList = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    debugList = [];
  }
}
readDebug();
setInterval(readDebug, 10_000);

export function debugEnabled(): boolean {
  return debugAll || debugList.includes(resource);
}

function push(list: QueryRecord[], record: QueryRecord, max: number): void {
  list.push(record);
  if (list.length > max) list.splice(0, list.length - max);
}

export function recordQuery(sql: string, ms: number): void {
  const slow = ms >= slowQueryWarning();
  totals.queries++;
  totals.totalMs += ms;
  const record = { sql: sql.length > 500 ? `${sql.slice(0, 500)}...` : sql, ms: Math.round(ms * 100) / 100, at: Date.now(), slow };
  push(recent, record, logSize());
  if (slow) {
    totals.slow++;
    push(recentSlow, record, 50);
  }
}

export function recordError(): void {
  totals.errors++;
}

export function snapshot(): QueryStatsSnapshot {
  return { resource, ...totals, recent: [...recent], recentSlow: [...recentSlow] };
}

const COLLECT = "aicore-mysql:collect";
const REPORT = "aicore-mysql:report";

// Every resource running the engine answers an admin tool's request with its own numbers.
on(COLLECT, (requestId: unknown) => {
  if (typeof requestId === "string") emit(REPORT, requestId, snapshot());
});

/** Asks every resource running the engine for its statistics and resolves with the answers after `waitMs`. */
export function collectQueryStats(waitMs = 300): Promise<QueryStatsSnapshot[]> {
  const requestId = `${resource}:${Date.now()}:${Math.random()}`;
  const answers: QueryStatsSnapshot[] = [];
  const handler = (id: unknown, report: unknown): void => {
    if (id === requestId && typeof report === "object" && report !== null) answers.push(report as QueryStatsSnapshot);
  };
  on(REPORT, handler);
  emit(COLLECT, requestId);
  return new Promise((resolve) =>
    setTimeout(() => {
      removeEventListener(REPORT, handler);
      resolve(answers.sort((a, b) => b.totalMs - a.totalMs));
    }, waitMs),
  );
}
