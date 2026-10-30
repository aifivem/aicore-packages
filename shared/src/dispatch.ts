/** A point on the map. */
export interface DispatchCoords {
  x: number;
  y: number;
  z: number;
}

/**
 * A police (or other job) alert a script sends through ai-core's dispatch layer (lib `dispatch.alert`); the active
 * alert system shows it to the on-duty members of `jobs`. Texts are already translated.
 */
export interface DispatchAlert {
  /** Radio code shown before the title ("10-71"). */
  code?: string;
  /** The headline ("Shots fired"). */
  title: string;
  /** One more line (the shop's name). */
  message?: string;
  /** Where it happened; without it the `source` player's position, else no map point. */
  coords?: DispatchCoords;
  /** Jobs whose on-duty members get it; default: the alert system's police jobs. */
  jobs?: string[];
  /** The player the alert is about (shooter, robber): systems that describe the suspect (vehicle, gender) read this player. */
  source?: number;
  /** Map blip: a GTA blip sprite and colour (default: the alert system's). */
  blip?: { sprite: number; color?: number; scale?: number };
  /** Seconds the alert stays (card, blip, waypoint key); default: the alert system's own. */
  duration?: number;
  /** Font Awesome solid icon name without `fa-` ("gun"). */
  icon?: string;
  /** `high` makes the card stand out (armed robbery, officer down). */
  priority?: "normal" | "high";
}

/** One alert system behind ai-core's dispatch layer (server side). */
export interface DispatchAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. Absent for ai-* systems. */
  version?: string;
  /** `coords` is filled from `source` when the caller left it out. */
  alert(alert: DispatchAlert): void;
  /** The system answers QB's `police:server:policeAlert` event itself: ai-core leaves that event to it. */
  answersPoliceAlert?: boolean;
}

const text = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const obj = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

/** An alert from untrusted input (another resource's export call); null without a title. Extra fields drop. */
export function toDispatchAlert(value: unknown): DispatchAlert | null {
  const v = obj(value);
  const title = text(v?.title, 80);
  if (!v || !title) return null;
  const c = obj(v.coords);
  const b = obj(v.blip);
  const jobs = Array.isArray(v.jobs)
    ? v.jobs
        .filter((j): j is string => typeof j === "string" && j.length <= 32)
        .slice(0, 10)
    : [];
  return {
    code: text(v.code, 12),
    title,
    message: text(v.message, 160),
    coords:
      c && finite(c.x) && finite(c.y) && finite(c.z)
        ? { x: c.x, y: c.y, z: c.z }
        : undefined,
    jobs: jobs.length ? jobs : undefined,
    source:
      finite(v.source) && Number.isInteger(v.source) && v.source > 0
        ? v.source
        : undefined,
    blip:
      b && finite(b.sprite)
        ? {
            sprite: Math.trunc(b.sprite),
            color: finite(b.color) ? Math.trunc(b.color) : undefined,
            scale: finite(b.scale)
              ? Math.min(3, Math.max(0.1, b.scale))
              : undefined,
          }
        : undefined,
    duration: finite(v.duration)
      ? Math.min(3600, Math.max(1, Math.round(v.duration)))
      : undefined,
    icon: text(v.icon, 40),
    priority: v.priority === "high" ? "high" : "normal",
  };
}

/** ai-core's dispatch export: whatever alert system runs shows the alert (none: false). */
export type DispatchServerExports = {
  SendDispatchAlert(alert: DispatchAlert): boolean;
};
