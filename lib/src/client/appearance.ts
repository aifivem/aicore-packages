import {
  CORE,
  toCharacterAppearance,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Looks on peds through ai-core's appearance layer, whatever clothing script runs (ai-appearance, tgiann-clothing). */
export const appearance = {
  /**
   * Puts a look (server `appearance.get`) on a ped of the look's model (create the ped with `look.model`); false when
   * the ped is gone, the model differs or no clothing script runs. On the player's own ped it changes their clothes.
   */
  apply: (ped: number, look: CharacterAppearance): boolean =>
    core.ApplyAppearance(ped, look),
  /** The look a ped wears now, null when the clothing script cannot tell. */
  read: (ped: number): CharacterAppearance | null =>
    toCharacterAppearance(core.GetPedAppearance(ped)),
};
