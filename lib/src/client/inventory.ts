import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The local player's inventory through ai-core's inventory layer (the inventory the server picked answers). */
export const inventory = {
  /** Opens the player's own inventory screen. */
  openInventory: (): void => core.OpenInventory(),
  /** Whether the player holds at least `count` of an item. */
  hasItem: (item: string, count = 1): boolean => core.HasItem(item, count),
};
