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

/** The x, y, z (and w) of `{ x, y, z }` or a Lua vector that arrived as `[x, y, z, w?]`. */
function parts(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  return [v.x, v.y, v.z, v.heading ?? v.w];
}

/** A point from client or export input: `{ x, y, z }` or a Lua vector `[x, y, z]`, every value finite; else null. */
export function readVec3(
  value: unknown,
): { x: number; y: number; z: number } | null {
  const p = parts(value);
  if (!p) return null;
  const [x, y, z] = [readFinite(p[0]), readFinite(p[1]), readFinite(p[2])];
  return x !== null && y !== null && z !== null ? { x, y, z } : null;
}

/** A point with a heading: `{ x, y, z, heading | w }` or a Lua vector4; a missing heading reads 0; else null. */
export function readVec4(
  value: unknown,
): { x: number; y: number; z: number; heading: number } | null {
  const point = readVec3(value);
  if (!point) return null;
  const raw = parts(value)?.[3];
  const heading = raw === undefined || raw === null ? 0 : readFinite(raw);
  return heading === null ? null : { ...point, heading };
}
