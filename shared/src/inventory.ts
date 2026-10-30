/**
 * ai-core's inventory layer: every script calls ai-core (lib `inventory`), ai-core forwards to the active inventory
 * through one adapter per inventory (`resources/[ai]/ai-core/resource/server/inventory/adapters/`).
 */

/** A player server id, or the id of another inventory (stash name, trunk plate...). */
export type InventoryRef = number | string

export type ItemMetadata = Record<string, unknown>

/** One stack of an inventory. */
export interface InventoryStack {
  name: string
  label: string
  count: number
  slot: number
  metadata: ItemMetadata
}

/** The stack a usable item handler gets. */
export interface UsedItem {
  name: string
  slot: number
  count: number
  metadata: ItemMetadata
}

/**
 * Runs when a player uses the item. Returning false keeps the item in inventories that take a used item themselves
 * (ai-inventory: the item's `consume` amount); other inventories follow their own item settings.
 */
export type UsableItemHandler = (source: number, item: UsedItem) => unknown

export interface ItemDefinition {
  name: string
  label: string
  weight: number
  /** One per stack (no stacking). */
  unique: boolean
  /** Using it closes the inventory screen. */
  close: boolean
  description: string
}

export interface StashDefinition {
  name: string
  label: string
  slots: number
  maxWeight: number
  /** Jobs allowed to open it; empty: everyone. */
  jobs: string[]
}

/** One inventory resource behind the layer (server side). Adapters translate calls and nothing else. */
export interface InventoryAdapter {
  /** The inventory's resource name (detection, version check, panel choice). */
  readonly resource: string
  /** The inventory version the adapter is written against; another installed version logs a warning. */
  readonly version: string
  addItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined,
    slot: number | undefined
  ): boolean
  removeItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined,
    slot: number | undefined
  ): boolean
  getItemCount(
    inv: InventoryRef,
    item: string,
    metadata: ItemMetadata | undefined
  ): number
  canCarryItem(
    inv: InventoryRef,
    item: string,
    count: number,
    metadata: ItemMetadata | undefined
  ): boolean
  getItems(inv: InventoryRef): InventoryStack[]
  clearInventory(inv: InventoryRef): void
  registerStash(stash: StashDefinition): void
  /** Opens a stash or another player's inventory on the player's screen, without range checks. */
  openInventory(source: number, inv: InventoryRef): boolean
  getItemDefinition(name: string): ItemDefinition | null
  getItemDefinitions(): Record<string, ItemDefinition>
  /**
   * Inventories with their own usable item list get every handler here. The others call the framework's use
   * functions (`ESX.UseItem`, QB `CanUseItem`), which ai-core's bridge answers from the layer.
   */
  registerUsableItem?(
    name: string,
    handler: (source: number, item: unknown) => unknown
  ): void
}

/** One inventory resource behind the layer (client side). */
export interface InventoryClientAdapter {
  readonly resource: string
  /** Opens the player's own inventory screen. */
  openInventory(): void
  hasItem(item: string, count: number): boolean
}

/** ai-core's server inventory exports; the active inventory answers them (false / 0 / empty while none runs). */
export type InventoryServerExports = {
  AddItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata,
    slot?: number
  ): boolean
  RemoveItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata,
    slot?: number
  ): boolean
  GetItemCount(inv: InventoryRef, item: string, metadata?: ItemMetadata): number
  HasItem(inv: InventoryRef, item: string, count?: number): boolean
  CanCarryItem(
    inv: InventoryRef,
    item: string,
    count?: number,
    metadata?: ItemMetadata
  ): boolean
  GetItems(inv: InventoryRef): InventoryStack[]
  ClearInventory(inv: InventoryRef): void
  /** Kept by ai-core and registered again with every inventory that becomes active. */
  RegisterStash(
    name: string,
    label: string,
    slots: number,
    maxWeight: number,
    jobs?: string[]
  ): void
  OpenInventory(source: number, inv: InventoryRef): boolean
  /** Kept by ai-core: works for inventories that start later, survives an inventory restart. */
  RegisterUsableItem(name: string, handler: UsableItemHandler): void
  GetItemDefinition(name: string): ItemDefinition | null
  GetItemDefinitions(): Record<string, ItemDefinition>
  /** Runs the handler registered for an item (ai-core's bridge calls it from `ESX.UseItem` / QB `CanUseItem`). */
  UseItem(source: number, name: string, item?: unknown): unknown
  IsUsableItem(name: string): boolean
}

/** ai-core's client inventory exports. */
export type InventoryClientExports = {
  /** Opens the player's own inventory screen. */
  OpenInventory(): void
  HasItem(item: string, count?: number): boolean
}
