/*
 * Result values as oxmysql (and mysql-async before it) returns them, so scripts written for oxmysql read the same
 * types. Adapted from oxmysql (https://github.com/overextended/oxmysql, LGPL-3.0, Overextended).
 */
import type { TypeCastField, TypeCastNext } from "mysql2";

/** DATETIME / TIMESTAMP / DATE as epoch milliseconds (server local time). */
function dateValue(field: TypeCastField): number | null | undefined {
  switch (field.type) {
    case "DATETIME":
    case "DATETIME2":
    case "TIMESTAMP":
    case "TIMESTAMP2":
    case "NEWDATE": {
      const value = field.string();
      return value ? new Date(value).getTime() : null;
    }
    case "DATE": {
      const value = field.string();
      return value ? new Date(`${value} 00:00:00`).getTime() : null;
    }
    default:
      return undefined;
  }
}

/**
 * Text protocol (`query`): dates as epoch ms, TINYINT(1) as boolean, BIT(1) as boolean, BLOB/TEXT as a raw buffer
 * that `fixBlobs` turns into a string (text) or a byte array (binary) once the column charset is known.
 */
export function typeCast(field: TypeCastField, next: TypeCastNext): unknown {
  const date = dateValue(field);
  if (date !== undefined) return date;
  switch (field.type) {
    case "TINY": {
      if (field.length !== 1) return next();
      const value = field.string();
      return value === null ? null : value === "1";
    }
    case "BIT": {
      const buffer = field.buffer();
      if (!buffer) return null;
      return buffer.length === 1 ? buffer[0] === 1 : buffer[0];
    }
    case "TINY_BLOB":
    case "MEDIUM_BLOB":
    case "LONG_BLOB":
    case "BLOB":
      return field.buffer();
    default:
      return next();
  }
}

/** Binary protocol (`execute`): only dates change; TINYINT(1) stays a number (oxmysql behaviour). */
export function typeCastExecute(
  field: TypeCastField,
  next: TypeCastNext,
): unknown {
  const date = dateValue(field);
  return date !== undefined ? date : next();
}
