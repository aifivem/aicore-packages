import {
  CORE,
  type CommandInfo,
  type CommandParam,
  type NotificationKind,
} from "@aicore-fivem/shared";
import { createLogger, formatText } from "../../shared";
import { loadLocaleTexts } from "../../fivem/locale";
import { notify } from "../notify";

const resource = GetCurrentResourceName();
const log = createLogger(resource);

// The error texts are ai-core's (generic words), in the `ai:locale` language; loaded on the first error.
let texts: Record<string, string> | null = null;
const t = (key: string, ...args: Array<string | number>): string =>
  formatText((texts ??= loadLocaleTexts(CORE.resource))[key] ?? key, args);

/** A command answer: an ai-core notification for a player, a console line for the server. */
function reply(source: number, text: string, kind: NotificationKind): void {
  if (source > 0) notify(source, text, kind);
  else log.info(text);
}

export class Command {
  readonly info: CommandInfo;
  private readonly usage: string;

  constructor(
    names: string[],
    private readonly params: readonly CommandParam[],
    help: string,
    aces: string[] | null,
    private readonly handler: (
      source: number,
      args: Record<string, unknown>,
      raw: string,
    ) => unknown,
  ) {
    this.info = { names, help, params: params.map((p) => ({ ...p })), aces };
    this.usage = [
      `/${names[0]}`,
      ...params.map((p) => (p.optional ? `[${p.name}]` : `<${p.name}>`)),
    ].join(" ");
  }

  /** Whether `source` may run it under `name` (the console always may). */
  allowed(source: number, name: string): boolean {
    const aces = this.info.aces;
    if (source <= 0 || !aces) return true;
    const player = String(source);
    return (
      aces.some((ace) => IsPlayerAceAllowed(player, ace)) ||
      Boolean(IsPlayerAceAllowed(player, `command.${name}`))
    );
  }

  suggestion(name: string): {
    name: string;
    help: string;
    params: Array<{ name: string; help: string }>;
  } {
    return {
      name: `/${name}`,
      help: this.info.help,
      params: this.params.map((p) => ({ name: p.name, help: p.help ?? "" })),
    };
  }

  run(source: number, name: string, raw: string[], line: string): void {
    if (!this.allowed(source, name))
      return reply(source, t("COMMAND_NOT_ALLOWED"), "error");
    const args = this.parse(raw);
    if (typeof args === "string") {
      reply(source, args, "error");
      return reply(source, t("COMMAND_USAGE", this.usage), "info");
    }
    const fail = (error: unknown) =>
      log.error(`command /${name} failed`, error);
    try {
      const result = this.handler(source, args, line);
      if (result instanceof Promise) result.catch(fail);
    } catch (error) {
      fail(error);
    }
  }

  /** The checked values by param name, or the error text to show. */
  private parse(raw: string[]): Record<string, unknown> | string {
    const args: Record<string, unknown> = {};
    for (const [i, param] of this.params.entries()) {
      const token =
        param.type === "longString"
          ? raw.slice(i).join(" ").trim()
          : (raw[i] ?? "");
      if (token === "") {
        if (!param.optional) return t("COMMAND_MISSING", param.name);
        continue;
      }
      if (param.type === "number" || param.type === "playerId") {
        const value = Number(token);
        if (!Number.isFinite(value)) return t("COMMAND_NUMBER", param.name);
        if (
          param.type === "playerId" &&
          (!Number.isInteger(value) ||
            value <= 0 ||
            !GetPlayerName(String(value)))
        )
          return t("COMMAND_PLAYER", token);
        args[param.name] = value;
      } else args[param.name] = token;
      if (param.type === "longString") break;
    }
    return args;
  }
}
