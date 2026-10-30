import {
  CORE,
  toCharacterAppearance,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Characters' stored looks through ai-core's appearance layer, whatever clothing script runs (ai-appearance, tgiann-clothing). */
export const appearance = {
  /**
   * A character's stored look (loaded or not): the ped model and the clothing script's data, null when it has none,
   * no clothing script runs or ai-core is stopped. Hand it to the client's `appearance.apply` unchanged.
   */
  get: (charId: number): Promise<CharacterAppearance | null> =>
    new Promise((resolve) => {
      try {
        core.GetCharacterAppearance(charId, (look) =>
          resolve(toCharacterAppearance(look)),
        );
      } catch {
        resolve(null);
      }
    }),
  /** The clothing script that answers, or null when none runs. */
  provider: (): string | null => core.GetAppearanceSystem(),
};
