/**
 * ai-core's inventory layer: every script calls ai-core (lib `inventory`), ai-core forwards to the active inventory
 * through one adapter per inventory (`resources/[ai]/ai-core/resource/server/inventory/adapters/`).
 */

/** A player server id, or the id of another inventory (stash name, trunk plate...). */
export type InventoryRef = number | string;

export type ItemMetadata = Record<string, unknown>;

/** One stack of an inventory. */
export interface InventoryStack {
  name: string;
  label: string;
  count: number;
  slot: number;
  metadata: ItemMetadata;
}

/** The stack a usable item handler gets. */
export interface UsedItem {
  name: string;
  slot: number;
  count: number;
  metadata: ItemMetadata;
}

/**
 * Runs when a player uses the item. Returning false keeps the item in inventories that take a used item themselves
 * (ai-inventory: the item's `consume` amount); other inventories follow their own item settings.
 */
export type UsableItemHandler = (source: number, item: UsedItem) => unknown;

export interface ItemDefinition {
  name: string;
  label: string;
  weight: number;
  /** One per stack (no stacking). */
  unique: boolean;
  /** Using it closes the inventory screen. */
  close: boolean;
  description: string;
  /** A picture url (`nui://`, `https://`) when the inventory has one. */
  image?: string;
}

export interface StashDefinition {
  name: string;
  label: string;
  slots: number;
  maxWeight: number;
  /** Jobs allowed to open it; empty: everyone. */
  jobs: string[];
}

/** One product of a script shop. */
export interface ShopProduct {
  name: string;
  /** Price per item, paid the inventory's own way (cash / bank). */
  price: number;
}

/** A shop a script registers (lib `inventory.registerShop`): opened by the server for a player, no place of its own. */
export interface ShopDefinition {
  /** Unique id (`police_armoury`). */
  name: string;
  label: string;
  items: ShopProduct[];
}

/** The weapon item the local player holds, as the inventory knows it (HUD weapon box). */
export interface HeldWeapon {
  /** Item name (`WEAPON_PISTOL`). */
  name: string;
  label: string;
  /** Picture url (`nui://...`); absent when the inventory has none. */
  image?: string;
}

/** Client -> server callback: every item definition of the active inventory (the client's snapshot). */
export const ITEM_DEFINITIONS_CALLBACK = "ai-core:itemDefinitions";
/** Server -> clients: `(changes: Record<name, ItemDefinition | null>)`, null = the item is gone. */
export const ITEM_DEFINITIONS_EVENT = "ai-core:client:itemDefinitions";
/** Client local: `(changes: Record<name, ItemDefinition | null>)` after the snapshot (every item) and each change. */
export const CLIENT_ITEM_DEFINITIONS_EVENT = "ai-core:client:itemDefinitionsChanged";
/** Server local, emitted by an inventory adapter: the active inventory's definitions changed (no arguments). */
export const ITEM_DEFINITIONS_CHANGED_EVENT = "ai-core:itemDefinitionsChanged";
