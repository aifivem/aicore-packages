/** Helpers usable on client and server. No FiveM natives here. */

export { sleep, waitFor } from "./wait"
export { bool, int, num, record, str, vec4, type Vec4 } from "./read"
export { toVehicleProps, type VehicleProps } from "./vehicleProps"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Client text made safe for the server console: one line, no control characters, no `^n` colour codes. */
export function logSafe(text: string, max: number): string {
  // oxlint-disable-next-line no-control-regex
  return text
    .replace(/\r?\n/g, " | ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\^\d/g, "")
    .slice(0, max)
}

/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
export function formatText(
  template: string,
  args: ReadonlyArray<string | number>
): string {
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)]
    return value === undefined ? match : String(value)
  })
}

/** GTA vehicle class (`GetVehicleClassFromName`) -> the type `CreateVehicleServerSetter` wants. */
export function vehicleTypeOfClass(vehicleClass: number): string {
  switch (vehicleClass) {
    case 8:
    case 13:
      return "bike"
    case 14:
      return "boat"
    case 15:
      return "heli"
    case 16:
      return "plane"
    case 21:
      return "train"
    default:
      return "automobile"
  }
}

/** One parsed value as an `args` result: `[value]`, or null to refuse the call. */
export const asArgs = <T>(value: T | null): [T] | null =>
  value === null ? null : [value]

export interface Logger {
  info(message: string, ...details: unknown[]): void
  warn(message: string, ...details: unknown[]): void
  error(message: string, ...details: unknown[]): void
}

/** Console output prefixed with the resource name, so server logs show where a line came from. */
export function createLogger(resource: string): Logger {
  const prefix = `[${resource}]`
  return {
    info: (message, ...details) =>
      console.log(`${prefix} ${message}`, ...details),
    warn: (message, ...details) =>
      console.warn(`${prefix} ^3${message}^7`, ...details),
    error: (message, ...details) =>
      console.error(`${prefix} ^1${message}^7`, ...details),
  }
}
