import type { ShopProduct } from "../inventory/items";

/** ai-inventory's own server exports (ai-core's inventory adapter uses them; ox / qb names are answered too). */
export type AiInventoryServerExports = {
  AddItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
    slot?: number,
  ): boolean;
  RemoveItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
    slot?: number,
  ): boolean;
  GetItemCount(
    inv: number | string,
    item: string,
    metadata?: Record<string, unknown>,
  ): number;
  /** Registers (or replaces) a script shop: `{ name, price }` products, paid from cash then bank. */
  RegisterShop(name: string, label: string, items: ShopProduct[]): void;
  /** Opens a registered script shop on the player's screen; false when it is unknown or the player has no inventory. */
  OpenShop(source: number, name: string): boolean;
  /** Every stack of an inventory with its item label. */
  GetItems(inv: number | string): Array<{
    name: string;
    label: string;
    count: number;
    slot: number;
    metadata: Record<string, unknown>;
  }>;
  CanCarryItem(
    inv: number | string,
    item: string,
    count: number,
    metadata?: Record<string, unknown>,
  ): boolean;
  /** `handler` returning false keeps the item (otherwise the item's "consume" amount is taken). */
  RegisterUsableItem(
    name: string,
    handler: (
      source: number,
      item: {
        name: string;
        slot: number;
        count: number;
        metadata: Record<string, unknown>;
      },
    ) => unknown,
  ): void;
  RegisterStash(
    name: string,
    label: string,
    slots: number,
    maxWeight: number,
    jobs?: string[],
    personal?: boolean,
  ): void;
  OpenInventory(source: number, inv: number | string): boolean;
  ClearInventory(inv: number | string): void;
  /** One item definition (ox shape), or every one by name when `name` is left out. */
  Items(name?: string): unknown;
  /** An inventory's carried weight and limit (grams), null when it is not loaded. */
  GetWeight(inv: number | string): { weight: number; maxWeight: number } | null;
  /** Replaces the metadata of the stack at `slot`; false when the inventory is not loaded or the slot is empty. */
  SetMetadata(
    inv: number | string,
    slot: number,
    metadata: Record<string, unknown>,
  ): boolean;
  /** Sets a loaded inventory's weight limit (grams) until it loads again or the panel changes the limit. */
  SetMaxWeight(inv: number | string, grams: number): boolean;
};

/** ai-inventory's own client exports (ai-core's inventory adapter uses them). */
export type AiInventoryClientExports = {
  /** Opens the player's own inventory screen (with the ground / trunk / glovebox around). */
  OpenSelf(): void;
  HasItem(
    items: string | string[] | Record<string, number>,
    amount?: number,
  ): boolean;
  /** How many of an item the player holds. */
  GetItemCount(item: string): number;
};
