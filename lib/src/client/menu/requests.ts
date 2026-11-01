import { CORE, LIB_UI, MENU_EVENTS } from "@aicore-fivem/shared";
import { resourceExport } from "../../fivem/exports";

export const ui = resourceExport(LIB_UI.resource);
/** The item picker is an admin tool of ai-core (it needs ai-core's inventory layer). */
export const core = resourceExport(CORE.resource);

export interface MenuListeners {
  /** The item under the pointer or focus (live previews). */
  onHover?: (item: string) => void;
  /** A switch row (`checked` item) was flipped; the menu stays open. */
  onToggle?: (item: string, checked: boolean) => void;
}

/** Menus, input dialogs and minigames this resource asked ai-lib (the item picker: ai-core) for, waiting for the player's answer. */
class Requests {
  private readonly resource = GetCurrentResourceName();
  private readonly waiting = new Map<number, (value: unknown) => void>();
  private readonly hovers = new Map<number, MenuListeners>();
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
    on(MENU_EVENTS.menuResult, answer);
    on(MENU_EVENTS.inputResult, answer);
  }

  ask(
    open: (id: number) => void,
    read: (value: unknown) => void,
    listeners?: MenuListeners,
  ): void {
    const id = ++this.nextId;
    this.waiting.set(id, read);
    if (listeners) this.hovers.set(id, listeners);
    open(id);
  }
}

export const requests = new Requests();
