import type {
  InputRequest,
  ItemPickerRequest,
  MenuRequest,
  PickedItem,
} from "@aicore-fivem/shared";
import { core, requests, ui, type MenuListeners } from "./requests";

/**
 * Shows ai-lib's menu and resolves with the picked item id, or null when the player closed it. The second argument is
 * `onHover` (the item under the pointer or focus, for live previews) or `{ onHover, onToggle }`: items with `checked`
 * are switch rows that flip in place without closing the menu. Arrows move, Enter picks; in a sub menu (`back: true`)
 * a short Escape resolves `MENU_BACK` and holding Escape closes (null).
 */
export function menu(
  request: MenuRequest,
  listeners?: ((item: string) => void) | MenuListeners,
): Promise<string | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => ui.OpenMenu(id, request),
      (value) => resolve(typeof value === "string" ? value : null),
      typeof listeners === "function" ? { onHover: listeners } : listeners,
    ),
  );
}

/** Shows ai-lib's input dialog and resolves with the entered values by field name, or null when closed. */
export function input(
  request: InputRequest,
): Promise<Record<string, string | number> | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => ui.OpenInput(id, request),
      (value) => {
        if (typeof value !== "object" || value === null) return resolve(null);
        const out: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(value))
          if (typeof v === "string" || typeof v === "number") out[k] = v;
        resolve(out);
      },
    ),
  );
}

/**
 * Shows ai-core's item picker (admin tools; the item list is only sent to admins): every item of the active inventory
 * with its picture and a search; clicks fill a list on the right (1, Ctrl 10, Shift 100) that stops at `target`'s
 * weight limit. Resolves with the list when the player takes it, null when closed. The caller's server gives the
 * items and checks every one.
 */
export function itemPicker(
  request: ItemPickerRequest,
): Promise<PickedItem[] | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenItemPicker(id, request),
      (value) => {
        if (!Array.isArray(value)) return resolve(null);
        resolve(
          value.flatMap((v: unknown) =>
            typeof v === "object" &&
            v !== null &&
            "name" in v &&
            "count" in v &&
            typeof v.name === "string" &&
            typeof v.count === "number" &&
            Number.isInteger(v.count) &&
            v.count > 0
              ? [{ name: v.name, count: v.count }]
              : [],
          ),
        );
      },
    ),
  );
}
