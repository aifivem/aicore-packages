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

/** One inventory resource behind the layer (server side). Adapters translate calls and nothing else. */
export interface InventoryAdapter {
  /** The inventory's resource name (detection, version check, panel choice). */
  readonly resource: string;
  /** The third-party inventory version the adapter is written against; another installed version logs a warning. None for ai-inventory. */
  readonly version?: string;
  addItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined,
    slot: number | undefined,
  ): boolean;
  removeItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined,
    slot: number | undefined,
  ): boolean;
  getItemCount(
    inv: InventoryRef,
    item: string,
    metadata: ItemMetadata | undefined,
  ): number;
  canCarryItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined,
  ): boolean;
  getItems(inv: InventoryRef): InventoryStack[];
  clearInventory(inv: InventoryRef): void;
  registerStash(stash: StashDefinition): void;
  /** Opens a stash or another player's inventory on the player's screen, without range checks. */
  openInventory(source: number, inv: InventoryRef): boolean;
  getItemDefinition(name: string): ItemDefinition | null;
  getItemDefinitions(): Record<string, ItemDefinition>;
  /** A player's carried weight and limit, when the inventory tells them. */
  getWeight?(source: number): { weight: number; maxWeight: number } | null;
  /** Replaces the metadata of the stack at `slot`; false when the slot is empty or the inventory has no way. */
  setMetadata(inv: InventoryRef, slot: number, metadata: ItemMetadata): boolean;
  /** Sets a player's weight limit (grams) until the inventory reloads it; false when the inventory has no way. */
  setMaxWeight(source: number, grams: number): boolean;
  /**
   * Inventories with their own usable item list get every handler here. The others call the framework's use
   * functions (`ESX.UseItem`, QB `CanUseItem`), which ai-core's bridge answers from the layer.
   */
  registerUsableItem?(
    name: string,
    handler: (source: number, item: unknown) => unknown,
  ): void;
  /** Registers (or replaces) a script shop; absent when the inventory has no shops. */
  registerShop?(shop: ShopDefinition): void;
  /** Opens a registered shop on the player's screen, without range checks; false when it could not. */
  openShop?(source: number, name: string): boolean;
}

/** The weapon item the local player holds, as the inventory knows it (HUD weapon box). */
export interface HeldWeapon {
  /** Item name (`WEAPON_PISTOL`). */
  name: string;
  label: string;
  /** Picture url (`nui://...`); absent when the inventory has none. */
  image?: string;
}

/** One inventory resource behind the layer (client side). */
export interface InventoryClientAdapter {
  readonly resource: string;
  /** Opens the player's own inventory screen. */
  openInventory(): void;
  hasItem(item: string, count: number): boolean;
  /** How many of an item the player holds, from the inventory's own client state; null when it has no such export. */
  itemCount(item: string): number | null;
  /** The held weapon item, or null (unarmed, or the inventory has no such export). */
  currentWeapon(): HeldWeapon | null;
}

/** ai-core's server inventory exports; the active inventory answers them (false / 0 / empty while none runs). */
export type InventoryServerExports = {
  AddItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata,
    slot?: number,
  ): boolean;
  RemoveItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata,
    slot?: number,
  ): boolean;
  GetItemCount(
    inv: InventoryRef,
    item: string,
    metadata?: ItemMetadata,
  ): number;
  HasItem(inv: InventoryRef, item: string, count?: number): boolean;
  CanCarryItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata,
  ): boolean;
  GetItems(inv: InventoryRef): InventoryStack[];
  ClearInventory(inv: InventoryRef): void;
  /** Kept by ai-core and registered again with every inventory that becomes active. */
  RegisterStash(
    name: string,
    label: string,
    slots: number,
    maxWeight: number,
    jobs?: string[],
  ): void;
  OpenInventory(source: number, inv: InventoryRef): boolean;
  /** Kept by ai-core: works for inventories that start later, survives an inventory restart. */
  RegisterUsableItem(name: string, handler: UsableItemHandler): void;
  GetItemDefinition(name: string): ItemDefinition | null;
  GetItemDefinitions(): Record<string, ItemDefinition>;
  /** A player's carried weight and limit (grams); null when the active inventory does not tell them. */
  GetInventoryWeight(
    source: number,
  ): { weight: number; maxWeight: number } | null;
  /** Kept by ai-core and registered again with every inventory that becomes active (`items`: `{ name, price }`). */
  RegisterShop(name: string, label: string, items: ShopProduct[]): void;
  /** Opens a registered shop on the player's screen (check access and range first); false when it could not. */
  OpenShop(source: number, name: string): boolean;
  /** Runs the handler registered for an item (ai-core's bridge calls it from `ESX.UseItem` / QB `CanUseItem`). */
  UseItem(source: number, name: string, item?: unknown): unknown;
  IsUsableItem(name: string): boolean;
  /** Names of every item a handler is registered for (`RegisterUsableItem`). */
  GetUsableItems(): string[];
  /** Replaces the metadata of the stack at `slot` (weapon ammo, components, tint...); false when it could not. */
  SetItemMetadata(inv: InventoryRef, slot: number, metadata: ItemMetadata): boolean;
  /** Sets a player's weight limit in grams until the inventory reloads it; false when the inventory has no way. */
  SetMaxWeight(source: number, grams: number): boolean;
};

/** ai-core's client inventory exports. */
export type InventoryClientExports = {
  /** Opens the player's own inventory screen. */
  OpenInventory(): void;
  HasItem(item: string, count?: number): boolean;
  /** The held weapon item through the active inventory, or null. */
  GetCurrentWeapon(): HeldWeapon | null;
  /** How many of an item the local player holds; null when the active inventory has no client count. */
  GetItemCount(item: string): number | null;
  /** Every item definition of the active inventory (a copy of ai-core's client mirror). */
  GetItemDefinitions(): Record<string, ItemDefinition>;
  GetItemDefinition(name: string): ItemDefinition | null;
};

/** Client -> server callback: every item definition of the active inventory (the client's snapshot). */
export const ITEM_DEFINITIONS_CALLBACK = "ai-core:itemDefinitions";
/** Server -> clients: `(changes: Record<name, ItemDefinition | null>)`, null = the item is gone. */
export const ITEM_DEFINITIONS_EVENT = "ai-core:client:itemDefinitions";
/** Client local: `(changes: Record<name, ItemDefinition | null>)` after the snapshot (every item) and each change. */
export const CLIENT_ITEM_DEFINITIONS_EVENT = "ai-core:client:itemDefinitionsChanged";
/** Server local, emitted by an inventory adapter: the active inventory's definitions changed (no arguments). */
export const ITEM_DEFINITIONS_CHANGED_EVENT = "ai-core:itemDefinitionsChanged";
