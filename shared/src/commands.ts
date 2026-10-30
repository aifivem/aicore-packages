/**
 * Commands and keybinds: what every resource announces to ai-core (lib `addCommand` and `Keybind`) so the admin panel
 * lists them and sets keybind defaults.
 */

export type CommandParamType = "number" | "playerId" | "string" | "longString"

/** One argument of a command, parsed and checked before the handler runs. */
export interface CommandParam {
  /** Name in the usage line, the chat suggestion and the handler's `args`. */
  name: string
  /** number: any number; playerId: the server id of an online player; string: one word; longString: the rest of the line (last param). */
  type: CommandParamType
  /** Lang text shown in the chat suggestion. */
  help?: string
  optional?: boolean
}

/** A command of the lib's `addCommand`, as the resource announces it to ai-core. */
export interface CommandInfo {
  /** The first is the name, the rest are aliases. */
  names: string[]
  help: string
  params: CommandParam[]
  /** null: everyone; otherwise the aces any of which allows it (`command.<name>` always allows too). */
  aces: string[] | null
}

/** A keybind of the lib's `Keybind`, as the resource announces it to ai-core's client. */
export interface KeybindInfo {
  resource: string
  /** Stable id; the key mapping command is `<name>_<key>`. */
  name: string
  /** Lang text shown in GTA's key settings. */
  description: string
  /** The script's own default key ("" = none). */
  defaultKey: string
  /** RegisterKeyMapping input mapper ("keyboard", "MOUSE_BUTTON", "PAD_DIGITALBUTTON"). */
  mapper: string
}

/** Client local events between the lib's `Keybind` and ai-core's client. */
export const KEYBIND = {
  /** lib -> ai-core: (info: KeybindInfo) a keybind waits for its default key. */
  announceEvent: "ai-core:client:keybind",
  /** ai-core -> lib: (resource, name, key) the default key to register: the panel's value, else the script's. */
  keyEvent: "ai-core:client:keybindKey",
} as const
