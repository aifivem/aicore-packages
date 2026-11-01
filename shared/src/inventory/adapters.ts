import type {
  HeldWeapon,
  InventoryRef,
  InventoryStack,
  ItemDefinition,
  ItemMetadata,
  ShopDefinition,
  StashDefinition,
} from "./items";

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
  /** Every stack the player holds, from the inventory's own client state; null when it has no such export. */
  items(): InventoryStack[] | null;
  /** Calls `listener` when the player's items may have changed (the layer reads `items` and sends what changed). */
  onChange?(listener: () => void): void;
}
