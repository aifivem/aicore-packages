import {
  CORE,
  type HeldWeapon,
  type ItemDefinition,
} from "@aicore-fivem/shared";
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
  /** How many of an item the player holds; null when the active inventory has no client count. */
  itemCount: (item: string): number | null => {
    const n: unknown = core.GetItemCount(item);
    return typeof n === "number" ? n : null;
  },
  /** An item's label, weight, flags and picture from ai-core's client mirror; null when unknown. */
  itemDefinition: (name: string): ItemDefinition | null =>
    toDefinition(core.GetItemDefinition(name)),
};

/** ai-core's answer, checked like `toHeldWeapon`. */
function toDefinition(value: unknown): ItemDefinition | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.label !== "string"
  )
    return null;
  return {
    name: value.name,
    label: value.label,
    weight: typeof value.weight === "number" ? value.weight : 0,
    unique: value.unique === true,
    close: value.close !== false,
    description: typeof value.description === "string" ? value.description : "",
    image: typeof value.image === "string" ? value.image : undefined,
  };
}
