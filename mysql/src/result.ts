import type { FieldPacket } from "mysql2";

const BINARY_CHARSET = 63;

/**
 * Buffers left in rows become what oxmysql returns: text columns a string, binary columns (charset 63) an array of
 * bytes, NULL stays null. Works on the rows of `query` (typeCast hands BLOB/TEXT over as buffers) and `execute`.
 */
export function fixBlobs(
  rows: unknown,
  fields: FieldPacket[] | undefined,
): void {
  if (!Array.isArray(rows) || rows.length === 0 || !fields) return;
  const binary = new Set<string>();
  for (const field of fields)
    if (field.characterSet === BINARY_CHARSET) binary.add(field.name);
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    for (const key in record) {
      const value = record[key];
      if (Buffer.isBuffer(value))
        record[key] = binary.has(key) ? [...value] : value.toString("utf8");
    }
  }
}

export type QueryType = "insert" | "update" | "single" | "scalar" | null;

interface Header {
  insertId?: number;
  affectedRows?: number;
}

/** The shape each call answers: insert id, affected rows, first row, first value of the first row, or the rows. */
export function shapeResult(type: QueryType, result: unknown): unknown {
  switch (type) {
    case "insert":
      return (result as Header | null)?.insertId ?? null;
    case "update":
      return (result as Header | null)?.affectedRows ?? null;
    case "single":
      return (Array.isArray(result) ? result[0] : null) ?? null;
    case "scalar": {
      const row: unknown = Array.isArray(result) ? result[0] : null;
      return (
        (row && typeof row === "object" ? Object.values(row)[0] : null) ?? null
      );
    }
    default:
      return result ?? null;
  }
}
