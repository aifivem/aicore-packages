import type { AdminPatch } from "@aicore-fivem/shared";
import { isRecord } from "../../shared";

/** A patch from a client: only the three known shapes pass, extra fields drop. */
export function toPatch(value: unknown): AdminPatch | null {
  if (!isRecord(value) || typeof value.file !== "string") return null;
  const key = typeof value.key === "string" ? value.key : undefined;
  switch (value.action) {
    case "set":
      return typeof value.section === "string"
        ? {
            file: value.file,
            action: "set",
            key,
            section: value.section,
            value: value.value,
          }
        : null;
    case "create":
      return key && typeof value.label === "string"
        ? { file: value.file, action: "create", key, label: value.label }
        : null;
    case "delete":
      return key ? { file: value.file, action: "delete", key } : null;
    default:
      return null;
  }
}

/** A deep copy through JSON: stored data never shares objects with a caller. */
export const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
