import {
  CORE,
  type InventoryRef,
  type InventoryStack,
  type ItemDefinition,
  type ItemMetadata,
  type ShopProduct,
  type UsableItemHandler,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Items through ai-core's inventory layer: the active inventory (ai-inventory, or another the panel picks) answers.
 * `inv` is a player server id or another inventory's id (stash name, plate). Calls fail (false / 0 / empty) while
 * no inventory runs.
 */
export const inventory = {
  /** Gives items; false when they do not fit or the item does not exist. */
  addItem: (
    inv: InventoryRef,
    item: string,
    count = 1,
    metadata?: ItemMetadata,
    slot?: number,
  ): boolean => core.AddItem(inv, item, count, metadata, slot),
  /** Takes items; false when there are not enough. */
  removeItem: (
    inv: InventoryRef,
    item: string,
    count = 1,
    metadata?: ItemMetadata,
    slot?: number,
  ): boolean => core.RemoveItem(inv, item, count, metadata, slot),
  /** How many of an item an inventory holds (stacks with matching metadata only when given). */
  getItemCount: (
    inv: InventoryRef,
    item: string,
    metadata?: ItemMetadata,
  ): number => core.GetItemCount(inv, item, metadata),
  /** Whether an inventory holds at least `count` of an item. */
  hasItem: (inv: InventoryRef, item: string, count = 1): boolean =>
    core.HasItem(inv, item, count),
  /** Whether the items would fit (weight and space). */
  canCarryItem: (
    inv: InventoryRef,
    item: string,
    count = 1,
    metadata?: ItemMetadata,
  ): boolean => core.CanCarryItem(inv, item, count, metadata),
  /** Every stack of an inventory with its item label. */
  getItems: (inv: InventoryRef): InventoryStack[] => core.GetItems(inv),
  /** Empties an inventory. */
  clearInventory: (inv: InventoryRef): void => core.ClearInventory(inv),
  /** Registers a stash (`jobs` empty: everyone may open it); ai-core registers it again with any inventory that starts later. */
  registerStash: (
    name: string,
    label: string,
    slots: number,
    maxWeight: number,
    jobs: string[] = [],
  ): void => core.RegisterStash(name, label, slots, maxWeight, jobs),
  /** Opens a stash or another player's inventory on the player's screen, without range checks (check before). */
  openInventory: (source: number, inv: InventoryRef): boolean =>
    core.OpenInventory(source, inv),
  /** Runs `handler` when a player uses the item; register once at start, ai-core keeps it across inventory restarts. */
  registerUsableItem: (name: string, handler: UsableItemHandler): void =>
    core.RegisterUsableItem(name, handler),
  /** Registers a shop (`{ name, price }` products); ai-core registers it again with any inventory that starts later. */
  registerShop: (name: string, label: string, items: ShopProduct[]): void =>
    core.RegisterShop(name, label, items),
  /** Opens a registered shop on the player's screen, without range or access checks (check before). */
  openShop: (source: number, name: string): boolean =>
    core.OpenShop(source, name),
  /** An item's label, weight and flags; null when the inventory does not know it. */
  getItemDefinition: (name: string): ItemDefinition | null =>
    core.GetItemDefinition(name),
  /** Every item definition of the active inventory, by name. */
  getItemDefinitions: (): Record<string, ItemDefinition> =>
    core.GetItemDefinitions() ?? {},
  /** Replaces the metadata of the stack at `slot` (ammo, components, durability); false when the inventory could not. */
  setItemMetadata: (
    inv: InventoryRef,
    slot: number,
    metadata: ItemMetadata,
  ): boolean => core.SetItemMetadata(inv, slot, metadata),
  /** Sets a player's weight limit in grams until the inventory reloads it; false when the inventory has no way. */
  setMaxWeight: (source: number, grams: number): boolean =>
    core.SetMaxWeight(source, grams),
  /** Names of every item a usable handler is registered for. */
  usableItems: (): string[] => core.GetUsableItems(),
};
