/**
 * Strict readers for client input (callback and event arguments): a wrong value is refused with null, never replaced
 * by a fallback (that is what the panel readers `num` / `int` do).
 */

/** A finite number, else null (NaN and Infinity refused). */
export function readFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A whole number in `[min, max]`, else null (fractions, NaN, Infinity and out-of-range values refused). */
export function readInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  return Number.isInteger(value) &&
    (value as number) >= min &&
    (value as number) <= max
    ? (value as number)
    : null;
}

/** A token or network id: a positive 32-bit integer, else null. */
export const readId = (value: unknown): number | null =>
  readInt(value, 1, 2_147_483_647);

/** A non-empty trimmed string cut to `max`, else null. */
export function readText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

/** An `args` parser for inputs that take one value: `onClientCallback(name, { args: oneArg(readId) }, (source, token) => ...)`. */
export const oneArg =
  <T>(read: (value: unknown) => T | null) =>
  ([value]: unknown[]): [T] | null => {
    const parsed = read(value);
    return parsed === null ? null : [parsed];
  };
