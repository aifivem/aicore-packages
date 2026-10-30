import { CORE, MENU_EVENTS, type InputRequest, type MenuRequest } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
class Requests {
  private readonly resource = GetCurrentResourceName();
  private readonly waiting = new Map<number, (value: unknown) => void>();
  private readonly hovers = new Map<number, (item: string) => void>();
  private nextId = 0;

  constructor() {
    const answer = (owner: unknown, id: unknown, value: unknown) => {
      if (owner !== this.resource || typeof id !== "number") return;
      this.waiting.get(id)?.(value);
      this.waiting.delete(id);
      this.hovers.delete(id);
    };
    on(MENU_EVENTS.menuHover, (owner: unknown, id: unknown, item: unknown) => {
      if (owner === this.resource && typeof id === "number" && typeof item === "string") this.hovers.get(id)?.(item);
    });
    on(MENU_EVENTS.menuResult, answer);
    on(MENU_EVENTS.inputResult, answer);
  }

  ask(open: (id: number) => void, read: (value: unknown) => void, onHover?: (item: string) => void): void {
    const id = ++this.nextId;
    this.waiting.set(id, read);
    if (onHover) this.hovers.set(id, onHover);
    open(id);
  }
}

const requests = new Requests();

/**
 * Shows ai-core's menu and resolves with the picked item id, or null when the player closed it; `onHover` hears the
 * item under the pointer or focus (live previews).
 */
export function menu(request: MenuRequest, onHover?: (item: string) => void): Promise<string | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenMenu(id, request),
      (value) => resolve(typeof value === "string" ? value : null),
      onHover,
    ),
  );
}

/** Shows ai-core's input dialog and resolves with the entered values by field name, or null when closed. */
export function input(request: InputRequest): Promise<Record<string, string | number> | null> {
  return new Promise((resolve) =>
    requests.ask(
      (id) => core.OpenInput(id, request),
      (value) => {
        if (typeof value !== "object" || value === null) return resolve(null);
        const out: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(value)) if (typeof v === "string" || typeof v === "number") out[k] = v;
        resolve(out);
      },
    ),
  );
}
