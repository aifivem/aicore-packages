/*
 * The oxmysql export surface, for the ai-mysql resource that stands in for oxmysql (`provide 'oxmysql'`), so
 * scripts written for oxmysql, mysql-async and ghmattimysql run unchanged. Signatures, callback rules and the
 * legacy aliases follow oxmysql (https://github.com/overextended/oxmysql, LGPL-3.0, Overextended).
 */
import type { Params } from "./args"
import {
  runExecute,
  runQuery,
  runStartTransaction,
  runTransaction,
  type TransactionQuery,
} from "./engine"
import { emitError, errorText } from "./log"
import { recordError } from "./stats"
import { getPool, isReady } from "./pool"
import type { QueryType } from "./result"

type Callback = (result: unknown, error?: string) => void

/** `params` may be the callback (`MySQL.query(sql, cb)`). */
function split(params: unknown, cb: unknown): [Params, Callback | undefined] {
  if (typeof cb === "function") return [params as Params, cb as Callback]
  if (typeof params === "function") return [undefined, params as Callback]
  return [params as Params, undefined]
}

function callSafely(
  resource: string,
  cb: Callback,
  ...args: [unknown, string?]
): void {
  try {
    cb(...args)
  } catch (error) {
    console.log(
      `^1SCRIPT ERROR in invoking resource ${resource}: ${String(error)}^0`
    )
  }
}

/**
 * oxmysql's rules: success → callback(result); failure → with a promise caller, callback(null, message) so the
 * caller's await rejects; with a plain callback, the error is printed and the callback is not called.
 */
function settle(
  resource: string,
  cb: Callback | undefined,
  isPromise: boolean | undefined,
  work: Promise<unknown>,
  sql?: unknown
): void {
  work.then(
    (result) => cb && callSafely(resource, cb, result),
    (error: unknown) => {
      const text = errorText(
        resource,
        error,
        typeof sql === "string" ? sql : undefined
      )
      emitError(resource, error, typeof sql === "string" ? sql : undefined)
      if (cb && isPromise) return callSafely(resource, cb, null, text)
      console.error(text)
    }
  )
}

const queryExport =
  (type: QueryType) =>
  (
    query: unknown,
    params: unknown,
    cb: unknown,
    resource = GetInvokingResource() || "unknown",
    isPromise?: boolean
  ): void => {
    const [values, callback] = split(params, cb)
    settle(
      resource,
      callback,
      isPromise,
      runQuery(resource, type, query, values),
      query
    )
  }

const executeExport =
  (unpack: boolean) =>
  (
    query: unknown,
    params: unknown,
    cb: unknown,
    resource = GetInvokingResource() || "unknown",
    isPromise?: boolean
  ): void => {
    const [values, callback] = split(params, cb)
    settle(
      resource,
      callback,
      isPromise,
      runExecute(resource, query, values, unpack),
      query
    )
  }

/** Transactions always answer through the callback: true when committed, false after a rollback. */
function transactionExport(
  queries: unknown,
  params: unknown,
  cb: unknown,
  resource = GetInvokingResource() || "unknown"
): void {
  const [values, callback] = split(params, cb)
  runTransaction(resource, queries, values).then(
    () => callback && callSafely(resource, callback, true),
    (error: unknown) => {
      recordError()
      console.error(
        `${resource} was unable to complete a transaction!\n${error instanceof Error ? error.message : String(error)}`
      )
      emit("oxmysql:transaction-error", {
        message: error instanceof Error ? error.message : String(error),
        resource,
      })
      if (callback) callSafely(resource, callback, false)
    }
  )
}

function startTransactionExport(
  work: (query: TransactionQuery) => Promise<boolean | void>,
  resource = GetInvokingResource() || "unknown"
) {
  return runStartTransaction(work).catch((error: unknown) => {
    console.error(errorText(resource, error))
    return false
  })
}

/** Every oxmysql export by name (`execute` and `fetch` are its deprecated aliases of `query`). */
export const OXMYSQL_EXPORTS: Record<string, (...args: never[]) => unknown> = {
  isReady,
  awaitConnection: () => getPool().then(() => true),
  query: queryExport(null),
  single: queryExport("single"),
  scalar: queryExport("scalar"),
  update: queryExport("update"),
  insert: queryExport("insert"),
  transaction: transactionExport,
  startTransaction: startTransactionExport,
  prepare: executeExport(true),
  rawExecute: executeExport(false),
  store: (query: string, cb: Callback) => cb(query),
  execute: queryExport(null),
  fetch: queryExport(null),
}

/** The `<name>_async` / `<name>Sync` form: (query, params, resource?) → Promise. */
export function promiseForm(
  name: string
): (query: unknown, params?: unknown, resource?: string) => Promise<unknown> {
  const fn = OXMYSQL_EXPORTS[name] as unknown as (
    q: unknown,
    p: unknown,
    cb: Callback,
    r: string,
    promise: boolean
  ) => unknown
  return (query, params = [], resource = GetInvokingResource() || "unknown") =>
    new Promise((resolve, reject) => {
      fn(
        query,
        params,
        (result, error) => (error ? reject(new Error(error)) : resolve(result)),
        resource,
        true
      )
    })
}

/** Names the legacy resources used for the same functions. */
export const GHMATTIMYSQL_ALIASES: Record<string, string> = {
  query: "execute",
  scalar: "scalar",
  transaction: "transaction",
  store: "store",
}
export const MYSQL_ASYNC_ALIASES: Record<string, string> = {
  update: "mysql_execute",
  insert: "mysql_insert",
  query: "mysql_fetch_all",
  scalar: "mysql_fetch_scalar",
  transaction: "mysql_transaction",
  store: "mysql_store",
}
