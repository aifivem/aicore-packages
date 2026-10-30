import { CORE, type HeldWeapon } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";
import { isRecord } from "../shared";

const core = resourceExport(CORE.resource);

/** ai-core's answer, checked: another resource's export returns unknown data. */
function toHeldWeapon(value: unknown): HeldWeapon | null {
  if (!isRecord(value) || typeof value.name !== "string") return null;
  return {
    name: value.name,
    label: typeof value.label === "string" ? value.label : value.name,
    image: typeof value.image === "string" ? value.image : undefined,
  };
}

/** The local player's inventory through ai-core's inventory layer (the inventory the server picked answers). */
export const inventory = {
  /** Opens the player's own inventory screen. */
  openInventory: (): void => core.OpenInventory(),
  /** Whether the player holds at least `count` of an item. */
  hasItem: (item: string, count = 1): boolean => core.HasItem(item, count),
  /** The weapon item in the player's hand (name, label, picture), or null; read it on `onCache("weapon")`, not per frame. */
  currentWeapon: (): HeldWeapon | null => toHeldWeapon(core.GetCurrentWeapon()),
};
