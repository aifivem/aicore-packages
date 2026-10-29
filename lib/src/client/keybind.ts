export interface KeybindOptions {
  /** Unique command name; include the default key (`inventory_TAB`) so changing the default does not keep an old bind. */
  name: string;
  /** Shown in GTA's key settings: a lang text, never a literal. */
  description: string;
  defaultKey?: string;
  /** Input mapper: "keyboard" (default), "MOUSE_BUTTON" for mouse buttons, "PAD_DIGITALBUTTON" for pads. */
  defaultMapper?: string;
  allowInPauseMenu?: boolean;
  disabled?: boolean;
  onPressed?: () => void;
  onReleased?: () => void;
}

/** A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. */
export class Keybind {
  readonly name: string;
  private disabled: boolean;
  private pressed = false;
  private readonly hash: number;

  constructor(private readonly options: KeybindOptions) {
    this.name = options.name;
    this.disabled = options.disabled ?? false;
    this.hash = GetHashKey(`+${options.name}`) | 0x80000000;

    RegisterCommand(`+${options.name}`, () => this.press(true), false);
    RegisterCommand(`-${options.name}`, () => this.press(false), false);
    RegisterKeyMapping(`+${options.name}`, options.description, options.defaultMapper ?? "keyboard", options.defaultKey ?? "");
    // The +/- commands are internal; keep them out of chat suggestions.
    setTimeout(() => {
      emit("chat:removeSuggestion", `/+${options.name}`);
      emit("chat:removeSuggestion", `/-${options.name}`);
    }, 500);
  }

  private press(down: boolean): void {
    if (this.disabled || (!this.options.allowInPauseMenu && IsPauseMenuActive())) return;
    this.pressed = down;
    if (down) this.options.onPressed?.();
    else this.options.onReleased?.();
  }

  /** Whether the key is held now. */
  get isPressed(): boolean {
    return this.pressed;
  }

  /** The key the player has bound right now, for HUD hints. */
  get currentKey(): string {
    return GetControlInstructionalButton(0, this.hash, true).substring(2);
  }

  disable(disabled: boolean): void {
    this.disabled = disabled;
    this.pressed = false;
  }
}
