/** Shared menu and input dialog contract (ai-core draws them for every resource through lib `menu` / `input`). */

export interface MenuItem {
  id: string;
  label: string;
  /** Font Awesome solid icon name without `fa-`. */
  icon?: string;
  description?: string;
  disabled?: boolean;
  /** A switch row: picking it flips the switch in place and the menu stays open (`menu`'s `onToggle` hears it). */
  checked?: boolean;
}

export interface MenuRequest {
  title: string;
  items: MenuItem[];
  /** A sub menu: a short Escape answers `MENU_BACK` (the caller opens the menu before), holding Escape closes. */
  back?: boolean;
}

/** ai-core's item picker (admin tools): every item of the active inventory with its picture, search and a count. */
export interface ItemPickerRequest {
  title: string;
  /** Whose inventory the items go to (server id): its free weight caps the list. The picking admin when absent. */
  target?: number;
}

/** One item the picker shows. */
export interface PickerItem {
  name: string;
  label: string;
  image?: string;
  /** Weight of one, in the inventory's unit (grams for ai-inventory and ox_inventory). */
  weight: number;
}

/** One row of the picker's list: what the player asked for. */
export interface PickedItem {
  name: string;
  count: number;
}

/** What the picker gets from the server: the items, and the target's weight when the inventory can tell it. */
export interface ItemPickerData {
  items: PickerItem[];
  room: { weight: number; maxWeight: number } | null;
}

/** Callback (admins only): (target: number | null) -> ItemPickerData. */
export const ITEM_PICKER_CALLBACK = "ai-core:admin:items";

/** What `menu()` resolves with when the player goes back from a sub menu (`back: true`). */
export const MENU_BACK = "__back";

export type InputField =
  | {
      name: string;
      label: string;
      type: "number";
      min?: number;
      max?: number;
      placeholder?: string;
    }
  | {
      name: string;
      label: string;
      type: "text";
      maxLength?: number;
      placeholder?: string;
      /** A several-line text box (notes, descriptions). */
      multiline?: boolean;
      /** The text the field starts with. */
      value?: string;
      /** Shown, not edited (reading a note); an empty read-only field does not block the confirm. */
      readOnly?: boolean;
    };

export interface InputRequest {
  title: string;
  fields: InputField[];
  /** Lang text of the confirm button (already translated). */
  confirm: string;
}

export const MENU_EVENTS = {
  /** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
  menuResult: "ai-lib:client:menuResult",
  /** Client local: (resource, requestId, itemId) the pointer or focus is on an item (previews). */
  menuHover: "ai-lib:client:menuHover",
  /** Client local: (resource, requestId, itemId, checked) the player flipped a switch row; the menu stays open. */
  menuToggle: "ai-lib:client:menuToggle",
  /** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
  inputResult: "ai-lib:client:inputResult",
} as const;
