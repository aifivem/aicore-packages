/** Shared menu and input dialog contract (ai-core draws them for every resource through lib `menu` / `input`). */

export interface MenuItem {
  id: string;
  label: string;
  /** Font Awesome solid icon name without `fa-`. */
  icon?: string;
  description?: string;
  disabled?: boolean;
}

export interface MenuRequest {
  title: string;
  items: MenuItem[];
}

export type InputField =
  | { name: string; label: string; type: "number"; min?: number; max?: number; placeholder?: string }
  | { name: string; label: string; type: "text"; maxLength?: number; placeholder?: string };

export interface InputRequest {
  title: string;
  fields: InputField[];
  /** Lang text of the confirm button (already translated). */
  confirm: string;
}

export const MENU_EVENTS = {
  /** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
  menuResult: "ai-core:client:menuResult",
  /** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
  inputResult: "ai-core:client:inputResult",
} as const;
