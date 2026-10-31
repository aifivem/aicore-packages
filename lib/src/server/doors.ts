import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Door locks through ai-core's door lock layer, by the active door lock script's own door id (ai-doorlock's panel id...). */
export const doors = {
  /** Locks or unlocks a door; `by` = the player acting (scripts without a server API need one). False when nothing took it. */
  setLocked: (id: string, locked: boolean, by?: number): boolean =>
    core.SetDoorLocked(id, locked, by),
  /** Whether a door is locked; null when unknown (no door lock, no such door, the script cannot tell on the server). */
  isLocked: (id: string): boolean | null => core.IsDoorLocked(id),
  /** The door lock script that answers, or null when none runs. */
  provider: (): string | null => core.GetDoorlockSystem(),
};
