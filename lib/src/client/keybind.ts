import {
  CORE,
  KEYBIND,
  type KeybindInfo,
  type KeyHintWhen,
} from "@aicore-fivem/shared";
import { isResourceStarted } from "../fivem/exports";

export interface KeybindOptions {
  /** Stable id, unique on the server, without the key (`inventory_open`); the mapping command is `<name>_<key>`. */
  name: string;
  /** Shown in GTA's key settings and the admin panel: a lang text, never a literal. */
  description: string;
  /** The script's default key; the admin panel's Keybinds tab can set another one. */
  defaultKey?: string;
  /** Input mapper: "keyboard" (default), "MOUSE_BUTTON" for mouse buttons, "PAD_DIGITALBUTTON" for pads. */
  defaultMapper?: string;
  allowInPauseMenu?: boolean;
  disabled?: boolean;
  onPressed?: () => void;
  onReleased?: () => void;
  /** HUDs list the key in their key hints: on foot, in a vehicle or always (the owner can change it in the panel). */
  hint?: KeyHintWhen;
  /** Font Awesome solid icon name (without `fa-`) HUDs draw next to the hint. */
  icon?: string;
  /** A short hint text (a lang text, one or two words); `description` when absent. */
  hintLabel?: string;
}

const resource = GetCurrentResourceName();
/** This resource's keybinds by name: ai-core answers each with its key at start and again when the panel changes it. */
const keybinds = new Map<string, (key: string) => void>();
let listening = false;

/** Asks ai-core's client for the key (it knows the panel's keybind defaults); without ai-core the script's own. */
function requestKey(info: KeybindInfo, apply: (key: string) => void): void {
  // ai-core's own keybinds are made while it is still "starting".
  if (resource !== CORE.resource && !isResourceStarted(CORE.resource))
    return apply(info.defaultKey);
  if (!listening) {
    listening = true;
    on(KEYBIND.keyEvent, (owner: unknown, name: unknown, key: unknown) => {
      if (
        owner === resource &&
        typeof name === "string" &&
        typeof key === "string"
      )
        keybinds.get(name)?.(key);
    });
  }
  let answered = false;
  keybinds.set(info.name, (key) => {
    answered = true;
    apply(key);
  });
  emit(KEYBIND.announceEvent, info);
  // ai-core answers once it knows the panel values (one server round trip at most); never leave a key unbound.
  setTimeout(() => {
    if (!answered) apply(info.defaultKey);
  }, 15_000);
}

/**
 * A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. The default key
 * comes from ai-core's admin panel when set there: the mapping command carries the key (`+<name>_<key>`), so a new
 * default makes a new mapping that every player gets. It is registered once ai-core answered (at start).
 */
export class Keybind {
  readonly name: string;
  private disabled: boolean;
  private pressed = false;
  private hash = 0;
  /** The mapping command in use; earlier ones (older keys) stay registered but do nothing. */
  private command = "";
  private readonly registered = new Set<string>();

  constructor(private readonly options: KeybindOptions) {
    this.name = options.name;
    this.disabled = options.disabled ?? false;
    const info: KeybindInfo = {
      resource,
      name: options.name,
      description: options.description,
      defaultKey: options.defaultKey ?? "",
      mapper: options.defaultMapper ?? "keyboard",
      hint: options.hint,
      icon: options.icon,
      hintLabel: options.hintLabel,
    };
    requestKey(info, (key) => this.register(key.toUpperCase()));
  }

  /**
   * Registers the mapping of a key; a later key (a panel change) registers its own mapping and the old one stops
   * acting. FiveM keeps every registered mapping and the player's binding per command, so the key is in the name.
   */
  private register(key: string): void {
    const command = key ? `${this.name}_${key}` : this.name;
    if (command === this.command) return;
    this.command = command;
    if (this.registered.has(command)) {
      this.hash = GetHashKey(`+${command}`) | 0x80000000;
      return;
    }
    this.registered.add(command);
    this.hash = GetHashKey(`+${command}`) | 0x80000000;
    RegisterCommand(
      `+${command}`,
      () => command === this.command && this.press(true),
      false,
    );
    RegisterCommand(
      `-${command}`,
      () => command === this.command && this.press(false),
      false,
    );
    RegisterKeyMapping(
      `+${command}`,
      this.options.description,
      this.options.defaultMapper ?? "keyboard",
      key,
    );
    // The +/- commands are internal; keep them out of chat suggestions.
    setTimeout(() => {
      emit("chat:removeSuggestion", `/+${command}`);
      emit("chat:removeSuggestion", `/-${command}`);
    }, 500);
  }

  private press(down: boolean): void {
    if (
      this.disabled ||
      (!this.options.allowInPauseMenu && IsPauseMenuActive())
    )
      return;
    this.pressed = down;
    if (down) this.options.onPressed?.();
    else this.options.onReleased?.();
  }

  /** Whether the key is held now. */
  get isPressed(): boolean {
    return this.pressed;
  }

  /** The key the player has bound right now, for HUD hints ("" until the mapping is registered). */
  get currentKey(): string {
    return this.hash
      ? GetControlInstructionalButton(0, this.hash, true).substring(2)
      : "";
  }

  disable(disabled: boolean): void {
    this.disabled = disabled;
    this.pressed = false;
  }
}
