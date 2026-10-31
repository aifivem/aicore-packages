/** Helpers usable on client and server. No FiveM natives here. */

export { sleep, waitFor } from "./wait";
export { bool, int, num, record, str, vec4, type Vec4 } from "./read";
export {
  oneArg,
  readFinite,
  readId,
  readInt,
  readText,
  readVec3,
  readVec4,
} from "./strict";
export { fail, isActionOk, replyError, type ActionResult } from "./action";
export {
  distance,
  flatDistance,
  headingTo,
  nearestOf,
  type Vec3,
} from "./vec";
export { pickRandom, randomInt, rollChance } from "./random";
export { ServerClock } from "./clock";
export {
  formatWeight,
  groupDigits,
  normalizePlate,
  round,
  stripGameText,
} from "./format";
export {
  ACCESS_FIELDS,
  accessFields,
  decideAccess,
  isPublic,
  readAccess,
  type AccessRule,
} from "./access";
export {
  BLIP_STYLE_FIELDS,
  readBlipStyle,
  type BlipStyle,
} from "./blipStyle";
export {
  polyFromCorners,
  zoneBounds,
  zoneContains,
  type ZoneShape,
} from "./zone";
export {
  LiveRecords,
  readRecords,
  RecordObjects,
  type RecordReader,
  type RecordSource,
} from "./records";
export { formatText, LangTexts } from "./lang";
export { spec } from "./spec";
export {
  toVehicleProps,
  toVehicleSetup,
  type VehicleProps,
  type VehicleSetup,
} from "./vehicleProps";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Client text made safe for the server console: one line, no control characters, no `^n` colour codes. */
export function logSafe(text: string, max: number): string {
  // oxlint-disable-next-line no-control-regex
  return text
    .replace(/\r?\n/g, " | ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\^\d/g, "")
    .slice(0, max);
}

/**
 * JSON-like text of an untrusted value cut at `max` characters, built without serializing the rest (a hostile
 * payload can be megabytes): for log lines. Deeper than 4 levels shows as `[...]` / `{...}`.
 */
export function previewJson(value: unknown, max: number): string {
  let out = "";
  const walk = (v: unknown, depth: number): void => {
    if (out.length >= max) return;
    if (typeof v === "string") {
      out += JSON.stringify(v.length > max ? v.slice(0, max) : v);
      return;
    }
    if (v === null || typeof v !== "object") {
      out += String(v);
      return;
    }
    if (depth > 4) {
      out += Array.isArray(v) ? "[...]" : "{...}";
      return;
    }
    if (Array.isArray(v)) {
      out += "[";
      for (let i = 0; i < v.length && out.length < max; i++) {
        if (i > 0) out += ",";
        walk(v[i], depth + 1);
      }
      out += "]";
      return;
    }
    out += "{";
    let first = true;
    for (const key in v) {
      if (out.length >= max) break;
      if (!first) out += ",";
      first = false;
      out += `${JSON.stringify(key.slice(0, 50))}:`;
      walk((v as Record<string, unknown>)[key], depth + 1);
    }
    out += "}";
  };
  walk(value, 0);
  return out.slice(0, max);
}

/** GTA vehicle class (`GetVehicleClassFromName`) -> the type `CreateVehicleServerSetter` wants. */
export function vehicleTypeOfClass(vehicleClass: number): string {
  switch (vehicleClass) {
    case 8:
    case 13:
      return "bike";
    case 14:
      return "boat";
    case 15:
      return "heli";
    case 16:
      return "plane";
    case 21:
      return "train";
    default:
      return "automobile";
  }
}

/** One parsed value as an `args` result: `[value]`, or null to refuse the call. */
export const asArgs = <T>(value: T | null): [T] | null =>
  value === null ? null : [value];

export interface Logger {
  info(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
}

/** Console output prefixed with the resource name, so server logs show where a line came from. */
export function createLogger(resource: string): Logger {
  const prefix = `[${resource}]`;
  return {
    info: (message, ...details) =>
      console.log(`${prefix} ${message}`, ...details),
    warn: (message, ...details) =>
      console.warn(`${prefix} ^3${message}^7`, ...details),
    error: (message, ...details) =>
      console.error(`${prefix} ^1${message}^7`, ...details),
  };
}

/** A data file's `"$schema"` key is for editors only: readers of panel files never see it. */
export function withoutSchemaKey(value: unknown): unknown {
  if (!isRecord(value) || !("$schema" in value)) return value;
  const { $schema: _schema, ...rest } = value;
  return rest;
}
export {
  PLACE_PED_SPEC,
  placePedFields,
  readPlacePed,
  type PlacePed,
} from "./placePed";
export { cellKey, gridCell } from "./grid";
