import { CORE, KEYBIND, type KeybindInfo } from "@aicore-fivem/shared"
import { isResourceStarted } from "../fivem/exports"

export interface KeybindOptions {
  /** Stable id, unique on the server, without the key (`inventory_open`); the mapping command is `<name>_<key>`. */
  name: string
  /** Shown in GTA's key settings and the admin panel: a lang text, never a literal. */
  description: string
  /** The script's default key; the admin panel's Keybinds tab can set another one. */
  defaultKey?: string
  /** Input mapper: "keyboard" (default), "MOUSE_BUTTON" for mouse buttons, "PAD_DIGITALBUTTON" for pads. */
  defaultMapper?: string
  allowInPauseMenu?: boolean
  disabled?: boolean
  onPressed?: () => void
  onReleased?: () => void
}

const resource = GetCurrentResourceName()
/** Keybinds of this resource waiting for ai-core's answer (the panel's default key, else their own). */
const waiting = new Map<string, (key: string) => void>()
let listening = false

/** Asks ai-core's client for the default key (it knows the panel's keybind defaults); without ai-core the script's own. */
function requestKey(info: KeybindInfo, apply: (key: string) => void): void {
  // ai-core's own keybinds are made while it is still "starting".
  if (resource !== CORE.resource && !isResourceStarted(CORE.resource))
    return apply(info.defaultKey)
  if (!listening) {
    listening = true
    on(KEYBIND.keyEvent, (owner: unknown, name: unknown, key: unknown) => {
      if (
        owner !== resource ||
        typeof name !== "string" ||
        typeof key !== "string"
      )
        return
      const done = waiting.get(name)
      waiting.delete(name)
      done?.(key)
    })
  }
  waiting.set(info.name, apply)
  emit(KEYBIND.announceEvent, info)
  // ai-core answers once it knows the panel values (one server round trip at most); never leave a key unbound.
  setTimeout(() => {
    if (waiting.get(info.name) !== apply) return
    waiting.delete(info.name)
    apply(info.defaultKey)
  }, 15_000)
}

/**
 * A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. The default key
 * comes from ai-core's admin panel when set there: the mapping command carries the key (`+<name>_<key>`), so a new
 * default makes a new mapping that every player gets. It is registered once ai-core answered (at start).
 */
export class Keybind {
  readonly name: string
  private disabled: boolean
  private pressed = false
  private hash = 0

  constructor(private readonly options: KeybindOptions) {
    this.name = options.name
    this.disabled = options.disabled ?? false
    const info: KeybindInfo = {
      resource,
      name: options.name,
      description: options.description,
      defaultKey: options.defaultKey ?? "",
      mapper: options.defaultMapper ?? "keyboard",
    }
    requestKey(info, (key) => this.register(key.toUpperCase()))
  }

  private register(key: string): void {
    const command = key ? `${this.name}_${key}` : this.name
    this.hash = GetHashKey(`+${command}`) | 0x80000000
    RegisterCommand(`+${command}`, () => this.press(true), false)
    RegisterCommand(`-${command}`, () => this.press(false), false)
    RegisterKeyMapping(
      `+${command}`,
      this.options.description,
      this.options.defaultMapper ?? "keyboard",
      key
    )
    // The +/- commands are internal; keep them out of chat suggestions.
    setTimeout(() => {
      emit("chat:removeSuggestion", `/+${command}`)
      emit("chat:removeSuggestion", `/-${command}`)
    }, 500)
  }

  private press(down: boolean): void {
    if (
      this.disabled ||
      (!this.options.allowInPauseMenu && IsPauseMenuActive())
    )
      return
    this.pressed = down
    if (down) this.options.onPressed?.()
    else this.options.onReleased?.()
  }

  /** Whether the key is held now. */
  get isPressed(): boolean {
    return this.pressed
  }

  /** The key the player has bound right now, for HUD hints ("" until the mapping is registered). */
  get currentKey(): string {
    return this.hash
      ? GetControlInstructionalButton(0, this.hash, true).substring(2)
      : ""
  }

  disable(disabled: boolean): void {
    this.disabled = disabled
    this.pressed = false
  }
}
