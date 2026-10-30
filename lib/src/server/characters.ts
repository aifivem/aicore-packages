import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Stored characters through ai-core (loaded ones go through the player exports). */
export const characters = {
  /**
   * Moves a stored character's spawn point (a sleeping body that was carried away); ai-core writes it once no load
   * or unload save holds the character. False when the character is loaded or the values are wrong.
   */
  setOfflinePosition: (
    charId: number,
    position: { x: number; y: number; z: number; heading?: number },
  ): boolean => core.SetOfflinePosition(charId, position),
};
