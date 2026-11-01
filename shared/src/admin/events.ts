/** Where `ADMIN.showEvent` opens the panel: the Bans section (with a search) or a character in the Players section. */
export type AdminShowTarget =
  | { section: "bans"; search?: string }
  | { section: "players"; charId?: number };

/** An `AdminShowTarget` from the network; null when it is not one. */
export function toAdminShowTarget(value: unknown): AdminShowTarget | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.section === "bans")
    return typeof v.search === "string" && v.search.length <= 64
      ? { section: "bans", search: v.search }
      : { section: "bans" };
  if (v.section === "players")
    return typeof v.charId === "number" && Number.isInteger(v.charId)
      ? { section: "players", charId: v.charId }
      : { section: "players" };
  return null;
}

/** Event names of the admin panel (owned by ai-core). */
export const ADMIN = {
  /** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
  ace: "ai.admin",
  /** Callback: (keybinds: KeybindInfo[] the admin's client knows) -> AdminOpenData (each script's summary). */
  openCallback: "ai-core:admin:open",
  /** Callback: (resource) -> the script's whole panel data, asked when the admin opens that script. */
  panelDataCallback: "ai-core:admin:panelData",
  applyCallback: "ai-core:admin:apply",
  closeEvent: "ai-core:admin:close",
  /**
   * Server -> client: (target?: AdminShowTarget) open the panel (the `aiadmin` command, other admin tools; checked on
   * the server), on a section when `target` is given.
   */
  showEvent: "ai-core:admin:show",
  /** Server -> admins with the panel open: (delta: AdminDelta). */
  deltaEvent: "ai-core:admin:delta",
  /** Server -> admins with the panel open: (delta: RecommendationDelta). */
  recommendationEvent: "ai-core:admin:recommendation",
  /** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
  worldEvent: (resource: string): string => `${resource}:admin:world`,
  /** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
  worldChangesCallback: (resource: string): string =>
    `${resource}:admin:worldChanges`,
} as const;
