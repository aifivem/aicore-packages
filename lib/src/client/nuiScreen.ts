import { hud } from "./hud";

/** A message to this resource's NUI page: `{ action, data }`. */
export interface NuiPageMessage {
  action: string;
  data?: unknown;
}

export interface NuiScreenOptions {
  /** Show the mouse cursor while open (default true). */
  cursor?: boolean;
  /** Runs after the screen closed (the page's own close button included): the script's cleanup. */
  onClose?: () => void;
  /** The page's `close` callback closes the screen (default true; false when only the script may close it). */
  closeCallback?: boolean;
}

type Reply = (result: unknown) => void;

/**
 * This resource's full-screen NUI: `open` takes the focus, hides every HUD (lib `hud`) and sends the open message;
 * `close` gives the focus back, shows the HUDs, sends `{ action: "close" }` and runs `onClose`. The page's `close`
 * callback closes it. For full-screen UIs (overlays such as a chat box or a wheel keep the HUD and their own focus).
 * One per resource, created once at module level.
 */
export class NuiScreen<M extends NuiPageMessage = NuiPageMessage> {
  private shown = false;

  /** `name` is the HUD hide reason (`<resource>:<name>`). */
  constructor(
    private readonly name: string,
    private readonly options: NuiScreenOptions = {},
  ) {
    if (options.closeCallback !== false)
      RegisterNuiCallback("close", (_data: unknown, cb: Reply) => {
        this.close();
        cb({ ok: true });
      });
  }

  get isOpen(): boolean {
    return this.shown;
  }

  /** Focuses the page (once) and sends `message`. */
  open(message: M): void {
    if (!this.shown) {
      this.shown = true;
      SetNuiFocus(true, this.options.cursor ?? true);
      hud.hide(this.name);
    }
    this.send(message);
  }

  close(): void {
    if (!this.shown) return;
    this.shown = false;
    SetNuiFocus(false, false);
    hud.show(this.name);
    SendNUIMessage({ action: "close", data: null });
    this.options.onClose?.();
  }

  /** A typed message to the page. */
  send(message: M): void {
    SendNUIMessage(message);
  }

  /**
   * A NUI callback of the page: `parse` checks the data (null answers `{ ok: false }`), the handler's result (awaited)
   * is the reply, `{ ok: true }` when it returns nothing.
   */
  on<A>(
    name: string,
    parse: (data: unknown) => A | null,
    handler: (data: A) => unknown,
  ): void {
    RegisterNuiCallback(name, (raw: unknown, cb: Reply) => {
      const data = parse(raw);
      if (data === null) return cb({ ok: false });
      Promise.resolve(handler(data)).then(
        (result) => cb(result ?? { ok: true }),
        () => cb({ ok: false }),
      );
    });
  }
}
