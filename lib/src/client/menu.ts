import {
  CORE,
  MENU_EVENTS,
  type InputRequest,
  type ItemPickerRequest,
  type MenuRequest,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

export interface MenuListeners {
  /** The item under the pointer or focus (live previews). */
  onHover?: (item: string) => void;
  /** A switch row (`checked` item) was flipped; the menu stays open. */
  onToggle?: (item: string, checked: boolean) => void;
}

/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
class Requests {
  private readonly resource = GetCurrentResourceName();
  private readonly waiting = new Map<number, (value: unknown) => void>();
  private readonly hovers = new Map<
    number,
    MenuListeners & { onPick?: (name: string, count: number) => void }
  >();
  private nextId = 0;

  constructor() {
    const answer = (owner: unknown, id: unknown, value: unknown) => {
      if (owner !== this.resource || typeof id !== "number") return;
      this.waiting.get(id)?.(value);
      this.waiting.delete(id);
      this.hovers.delete(id);
    };
    on(MENU_EVENTS.menuHover, (owner: unknown, id: unknown, item: unknown) => {
      if (
        owner === this.resource &&
        typeof id === "number" &&
        typeof item === "string"
      )
        this.hovers.get(id)?.onHover?.(item);
    });
    on(
      MENU_EVENTS.menuToggle,
      (owner: unknown, id: unknown, item: unknown, checked: unknown) => {
        if (
          owner === this.resource &&
          typeof id === "number" &&
          typeof item === "string" &&
          typeof checked === "boolean"
        )
          this.hovers.get(id)?.onToggle?.(item, checked);
      },
    );
    on(
      MENU_EVENTS.itemPicked,
      (owner: unknown, id: unknown, name: unknown, count: unknown) => {
        if (
          owner === this.resource &&
          typeof id === "number" &&
          typeof name === "string" &&
          typeof count === "number"
        )
          this.hovers.get(id)?.onPick?.(name, count);
      },
    );
    on(MENU_EVENTS.menuResult, answer);
    on(MENU_EVENTS.inputResult, answer);
  }

  ask(
    open: (id: number) => void,
    read: (value: unknown) => void,
    listeners?: MenuListeners & {
      onPick?: (name: string, count: number) => void;
    },
  ): void {
    const id = ++this.nextId;
    this.waiting.set(id, read);
    if (listeners) this.hovers.set(id, listeners);
    open(id);
  }
}

const requests = new Requests();

/**
 * Shows ai-core's menu and resolves with the picked item id, or null when the player closed it. The second argument is
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
      (id) => core.OpenMenu(id, request),
      (value) => resolve(typeof value === "string" ? value : null),
      typeof listeners === "function" ? { onHover: listeners } : listeners,
    ),
  );
}

/** Shows ai-core's input dialog and resolves with the entered values by field name, or null when closed. */
export function input(
  request: InputRequest,
): Promise<Record<string, string | number> | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenInput(id, request),
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
 * with its picture, a search and a count. `onPick(name, count)` runs for every pick while it stays open; resolves
 * when the player closes it.
 */
export function itemPicker(
  request: ItemPickerRequest,
  onPick: (name: string, count: number) => void,
): Promise<void> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenItemPicker(id, request),
      () => resolve(),
      { onPick },
    ),
  );
}
