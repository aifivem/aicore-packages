import {
  CORE,
  toCharacterAppearance,
  type CharacterAppearance,
  type ClothingMenu,
  type JobOutfit,
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
  /** Opens the clothing script's clothing shop, barber or saved outfits for the player; false when it has none. */
  openMenu: (menu: ClothingMenu): boolean => core.OpenClothingMenu(menu),
  /** Puts a job outfit (collection pieces) on the player until `reloadSkin`, not saved; false when it cannot. */
  wearOutfit: (outfit: JobOutfit): boolean => core.WearOutfit(outfit),
  /** Puts the player's saved look back on (takes a job outfit off); false without a clothing script. */
  reloadSkin: (): boolean => core.ReloadSkin(),
};
