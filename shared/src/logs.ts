/** Log contracts: every ai-* resource logs through ai-core, which sends to the providers turned on in its panel. */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogOptions {
  level?: LogLevel;
  /** The player who did it (server id); their name, character and identifiers are added. */
  source?: number;
  /** The player it was done to. */
  target?: number;
  /** Extra fields (amounts, item names, coordinates...). */
  metadata?: Record<string, unknown>;
}

/** How a resource describes one of its log channels. Webhook urls are never here: they live in ai-core's panel-edited data/secrets.json. */
export interface LogChannel {
  /** Dataset name for Fivemanage / FiveM Stats (default: the resource name). */
  dataset?: string;
  /** false turns the channel off. */
  active?: boolean;
}

export interface LogPlayer {
  serverId: number;
  name: string;
  identifiers: Record<string, string>;
  citizenid?: string;
  character?: string;
}

/** What every provider receives. */
export interface LogEntry {
  resource: string;
  channel: string;
  level: LogLevel;
  message: string;
  /** Unix seconds. */
  time: number;
  dataset: string;
  source?: number;
  target?: number;
  player?: LogPlayer;
  targetPlayer?: LogPlayer;
  metadata: Record<string, unknown>;
}
