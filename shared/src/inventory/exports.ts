import type {
  HeldWeapon,
  InventoryRef,
  InventoryStack,
  ItemDefinition,
  ItemMetadata,
  ShopProduct,
  UsableItemHandler,
} from "./items";

/** One item of a combined carry check (`CanCarryItems`). */
export type CarryItem = { name: string; count: number; metadata?: ItemMetadata };

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
  /** Whether all the items fit together (weight and space shared, like one trade or reward). */
  CanCarryItems(inv: InventoryRef, items: CarryItem[]): boolean;
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
  /** Every stack the local player holds; null when the active inventory has no client list (ask the server). */
  GetItems(): InventoryStack[] | null;
  /** Every item definition of the active inventory (a copy of ai-core's client mirror). */
  GetItemDefinitions(): Record<string, ItemDefinition>;
  GetItemDefinition(name: string): ItemDefinition | null;
};
