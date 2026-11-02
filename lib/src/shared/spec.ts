import type { DataSpec } from "@aifivem/shared";

/** Panel data spec builders for a script's `schema.ts` (the panel's own value types stay in `@aifivem/shared`). */
export const spec = {
  /** A whole number from `min` to `max`. */
  int: (min: number, max: number, optional = false): DataSpec => ({
    type: "number",
    min,
    max,
    integer: true,
    ...(optional ? { optional } : {}),
  }),
  /** A number from `min` to `max`. */
  num: (min: number, max: number, optional = false): DataSpec => ({
    type: "number",
    min,
    max,
    ...(optional ? { optional } : {}),
  }),
};
