import type { AdminDelta } from "../admin/panel";
import type { CommandInfo } from "../commands";
import type { LogChannel, LogOptions } from "../logs";
import type { Branding } from "../player";

/** ai-core's services for other scripts: branding, logs, the admin panel, connection checks, buckets (part of `AiCoreServerExports`). */
export type CoreServiceServerExports = {
  /** The server's brand (name, subtitle, taglines, background) from the panel's General settings. */
  GetBranding(): Branding;

  /** Sends a log of the calling resource to every provider turned on (Discord, Fivemanage, FiveM Stats, console). */
  Log(channel: string, message: string, options?: LogOptions): void;
  /** Describes the calling resource's log channels (datasets, on/off); call once at start. */
  LogChannels(channels: Record<string, LogChannel>): void;

  /** A resource with an admin panel announces itself (the lib's AdminPanel does it at start). */
  RegisterAdminPanel(resource: string): void;
  /** A panel resource changed a record: ai-core forwards it to the admins with the panel open. */
  AdminPanelChanged(delta: AdminDelta): void;
  /** The lib's `addCommand` announces a resource's commands for the panel's Commands tab (dropped when it stops). */
  RegisterCommands(resource: string, commands: CommandInfo[]): void;

  /** Values of a lookup list (items of the active inventory, jobs, gangs, accounts) for the admin panel's validation. */
  GetLookupValues(source: import("../admin/lookups").LookupSource): string[];
  /** Lists another script's own settings screen on the dashboard (opened by `command` or embedded `url`). */
  RegisterExternalPanel(panel: {
    id?: string;
    label: string;
    icon?: string;
    description?: string;
    command?: string;
    url?: string;
  }): void;
  /** Adds a check every connecting player passes: return a refusal text, or null to let the player through. */
  AddConnectionCheck(
    id: string,
    check: (
      source: number,
      identifiers: Record<string, string>,
    ) => string | null | undefined,
  ): void;
  /** Declares that `keep` (default: the calling resource) makes the `remove` resources unneeded (console warning, refused joins while both run). */
  RegisterReplacement(remove: string | string[], keep?: string): void;
  /** Scripts installed next to the one that replaces them; `running` = both started. */
  GetConflicts(): {
    keep: string;
    remove: string;
    running: boolean;
    from: string;
  }[];
  /** The players in a player's OneSync scope (~424 m), kept from ai-core's one set of scope handlers (lib `playersNear`). */
  GetPlayersInScope(source: number): number[];
  /** Scripts with a newer GitHub release than the running version (ai-core's update check). */
  GetUpdates(): import("../admin/panel").UpdateInfo[];

  /** A free routing bucket for the calling resource (no population, strict lockdown); freed when it stops. */
  AcquireBucket(tag: string): number;
  /** Gives a bucket back (only the resource that took it can); move its players out first. */
  ReleaseBucket(id: number): boolean;
};
