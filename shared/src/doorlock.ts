/**
 * ai-core's door lock layer: lock, unlock and read a door by the door lock script's own id (ai-doorlock, tgiann-doorlock,
 * ox_doorlock...). `docs/compat/doorlock.md`.
 */

/** One door lock script on ai-core's server (`resource/server/doorlock/`). */
export interface DoorlockAdapter {
  resource: string;
  version?: string;
  /** Meant to run next to ai-doorlock. */
  besideOurs?: boolean;
  /**
   * Locks or unlocks a door; false when the script has no such door or refused. `by` is a player whose client or
   * session a script needs to carry the change (scripts without a server API).
   */
  setLocked(id: string, locked: boolean, by: number | null): boolean;
  /** Whether the door is locked; null when the script has no such door or cannot tell on the server. */
  isLocked(id: string): boolean | null;
}

/** ai-core's door lock exports (lib `doors`): a door is the active script's door id (text). */
export type DoorlockServerExports = {
  /** The door lock script the layer forwards to, or null. */
  GetDoorlockSystem(): string | null;
  /** Locks or unlocks a door; false when no door lock runs, the door is unknown or the script refused. */
  SetDoorLocked(id: string, locked: boolean, by?: number): boolean;
  /** Whether a door is locked; null when unknown (no door lock, no such door, the script cannot tell). */
  IsDoorLocked(id: string): boolean | null;
};
