import type { LogChannel, LogOptions } from "@aicore-fivem/shared"
import { optionalExport } from "../fivem/exports"

/**
 * Sends a log through ai-core's log system (Discord, Fivemanage, FiveM Stats, console: whatever its panel turns on).
 * Does nothing while ai-core is not running.
 *
 *   aiLog("purchase", `bought ${item} for ${price}`, { source, metadata: { item, price } });
 */
export function aiLog(
  channel: string,
  message: string,
  options?: LogOptions
): void {
  optionalExport("ai-core")?.Log(channel, message, options)
}

/** Describes this resource's log channels (dataset names, on/off); call once at start. */
export function aiLogChannels(channels: Record<string, LogChannel>): void {
  optionalExport("ai-core")?.LogChannels(channels)
}
