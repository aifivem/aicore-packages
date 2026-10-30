import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Revive, heal and the down state through ai-core's medical layer, whatever death / ambulance script runs. */
export const medical = {
  /** Gets a downed player up where they lie; false when not down or no death script runs. */
  revive: (source: number): boolean => core.RevivePlayer(source),
  /** Full health for a player who is not down; false when no death script runs. */
  heal: (source: number): boolean => core.HealPlayer(source),
  /** Whether the player is down (false without a death script). */
  isDead: (source: number): boolean => core.IsPlayerDead(source),
  /** The death script that answers (ai-death...), or null when none runs. */
  provider: (): string | null => core.GetMedicalSystem(),
};
