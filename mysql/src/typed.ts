import type { Params } from "./args"

/** The query functions the typed helpers run on (the `mysql` object). */
interface Runner {
  query<T = unknown>(sql: string, params?: Params): Promise<T>
  insert(sql: string, params?: Params): Promise<number | null>
  update(sql: string, params?: Params): Promise<number | null>
}

type AnyTables = Record<string, Record<string, unknown>>
type Where<Row> = { [C in keyof Row]?: Row[C] }

/** Identifiers come from the generated types, but are checked at runtime too: never SQL from a value. */
const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`invalid identifier "${name}"`)
  return `\`${name}\``
}

/** `a = ? AND b IS NULL ...` from an equality object; empty means no filter. */
function whereSql(
  where: Record<string, unknown> | undefined
): [string, unknown[]] {
  const parts: string[] = []
  const values: unknown[] = []
  for (const [column, value] of Object.entries(where ?? {})) {
    if (value === undefined) continue
    if (value === null) parts.push(`${ident(column)} IS NULL`)
    else {
      parts.push(`${ident(column)} = ?`)
      values.push(value)
    }
  }
  return [parts.length > 0 ? ` WHERE ${parts.join(" AND ")}` : "", values]
}

export interface SelectOptions<Row> {
  orderBy?: { column: keyof Row & string; desc?: boolean }
  limit?: number
}

/**
 * Typed table access on the resource's generated `tables.ts` (`aicore-db-types` writes it from `sql/main.sql`):
 * table and column names, filter values, inserted rows and results are checked against the real tables at compile
 * time. Equality filters only; anything else (joins, ranges, sums) stays a raw `mysql.query<Pick<Tables["t"], ...>[]>`.
 */
export function typedDb<
  T extends AnyTables,
  I extends { [K in keyof T]: Record<string, unknown> },
>(db: Runner) {
  return {
    /** Rows of a table with the picked columns, filtered by column equality. */
    async select<K extends keyof T & string, C extends keyof T[K] & string>(
      table: K,
      columns: readonly C[],
      where?: Where<T[K]>,
      options: SelectOptions<T[K]> = {}
    ): Promise<Pick<T[K], C>[]> {
      if (columns.length === 0)
        throw new Error("select needs at least one column")
      const [filter, values] = whereSql(where)
      const order = options.orderBy
        ? ` ORDER BY ${ident(options.orderBy.column)}${options.orderBy.desc ? " DESC" : ""}`
        : ""
      const limit =
        options.limit !== undefined
          ? ` LIMIT ${Math.max(0, Math.floor(options.limit))}`
          : ""
      const rows = await db.query<Pick<T[K], C>[]>(
        `SELECT ${columns.map(ident).join(", ")} FROM ${ident(table)}${filter}${order}${limit}`,
        values
      )
      return rows ?? []
    },

    /** The first matching row, or null. */
    async first<K extends keyof T & string, C extends keyof T[K] & string>(
      table: K,
      columns: readonly C[],
      where?: Where<T[K]>
    ): Promise<Pick<T[K], C> | null> {
      const [filter, values] = whereSql(where)
      const rows = await db.query<Pick<T[K], C>[]>(
        `SELECT ${columns.map(ident).join(", ")} FROM ${ident(table)}${filter} LIMIT 1`,
        values
      )
      return rows?.[0] ?? null
    },

    /** Inserts one row; the new AUTO_INCREMENT id (or null). */
    insert<K extends keyof T & string>(
      table: K,
      row: I[K]
    ): Promise<number | null> {
      const entries = Object.entries(row).filter(([, v]) => v !== undefined)
      if (entries.length === 0)
        throw new Error("insert needs at least one column")
      return db.insert(
        `INSERT INTO ${ident(table)} (${entries.map(([c]) => ident(c)).join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`,
        entries.map(([, v]) => v)
      )
    },

    /** Sets columns on the matching rows; the number of changed rows. A filter is required (no table-wide update). */
    async update<K extends keyof T & string>(
      table: K,
      set: Where<T[K]>,
      where: Where<T[K]>
    ): Promise<number> {
      const changes = Object.entries(set).filter(([, v]) => v !== undefined)
      const [filter, values] = whereSql(where)
      if (changes.length === 0)
        throw new Error("update needs at least one column to set")
      if (!filter) throw new Error(`update of ${table} needs a filter`)
      const changed = await db.update(
        `UPDATE ${ident(table)} SET ${changes.map(([c]) => `${ident(c)} = ?`).join(", ")}${filter}`,
        [...changes.map(([, v]) => v), ...values]
      )
      return changed ?? 0
    },

    /** Deletes the matching rows; the number deleted. A filter is required (no table-wide delete). */
    async remove<K extends keyof T & string>(
      table: K,
      where: Where<T[K]>
    ): Promise<number> {
      const [filter, values] = whereSql(where)
      if (!filter) throw new Error(`delete from ${table} needs a filter`)
      const changed = await db.update(
        `DELETE FROM ${ident(table)}${filter}`,
        values
      )
      return changed ?? 0
    },
  }
}
