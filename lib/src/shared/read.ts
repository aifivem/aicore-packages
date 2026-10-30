/** Small readers for panel content (`data/*.json`): every one returns the fallback when the value is missing or wrong. */

/** A finite number clamped to `[min, max]`, else the fallback. */
export function num(
  value: unknown,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** `num` rounded to an integer. */
export function int(
  value: unknown,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  return Math.round(num(value, fallback, min, max));
}

/** A boolean, else the fallback. */
export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** A trimmed non-empty string cut to `max`, else the fallback. */
export function str(value: unknown, fallback: string, max = 64): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

/** The value as a plain object, or an empty one. */
export function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** A position with heading; each missing field comes from the fallback. */
export function vec4(value: unknown, fallback: Vec4): Vec4 {
  const v = record(value);
  return {
    x: num(v.x, fallback.x),
    y: num(v.y, fallback.y),
    z: num(v.z, fallback.z),
    heading: num(v.heading, fallback.heading),
  };
}
