import {
  CLIENT_ITEM_COUNT_EVENT,
  CORE,
  type HeldWeapon,
  type InventoryStack,
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
  /** Every item definition of ai-core's client mirror, by name. */
  itemDefinitions: (): Record<string, ItemDefinition> => {
    const all: unknown = core.GetItemDefinitions();
    const out: Record<string, ItemDefinition> = {};
    if (isRecord(all))
      for (const [name, def] of Object.entries(all)) {
        const read = toDefinition(def);
        if (read) out[name] = read;
      }
    return out;
  },
  /** Every stack the player holds; null when the active inventory has no client list (ask your server). */
  items: (): InventoryStack[] | null => {
    const list: unknown = core.GetItems();
    return Array.isArray(list) ? list.flatMap(toStack) : null;
  },
  /** Runs `handler(item, count, previous)` each time the player's total of an item changes in the active inventory. */
  onCount: (
    handler: (item: string, count: number, previous: number) => void,
  ): void => {
    on(
      CLIENT_ITEM_COUNT_EVENT,
      (item: unknown, count: unknown, previous: unknown) => {
        if (typeof item === "string" && typeof count === "number")
          handler(item, count, typeof previous === "number" ? previous : 0);
      },
    );
  },
};

/** One stack of ai-core's answer, checked; none when it is not one. */
function toStack(value: unknown): InventoryStack[] {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.count !== "number" ||
    typeof value.slot !== "number"
  )
    return [];
  return [
    {
      name: value.name,
      label: typeof value.label === "string" ? value.label : value.name,
      count: value.count,
      slot: value.slot,
      metadata: isRecord(value.metadata) ? value.metadata : {},
    },
  ];
}

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
