import { ADMIN, CORE, type CommandInfo, type CommandParam, type NotificationKind } from "@aicore-fivem/shared";
import { createLogger, formatText } from "../shared";
import { optionalExport } from "../fivem/exports";
import { loadLocaleTexts } from "../fivem/locale";
import { notify } from "./notify";

const resource = GetCurrentResourceName();
const log = createLogger(resource);

type Value<P extends CommandParam> = P["type"] extends "number" | "playerId" ? number : string;

/** The handler's `args`: one value per param by name, `undefined` for a missing optional one. */
export type CommandArgs<P extends readonly CommandParam[]> = {
  [K in P[number] as K["name"]]: K["optional"] extends true ? Value<K> | undefined : Value<K>;
};

export interface CommandOptions<P extends readonly CommandParam[]> {
  /** Lang text: what the command does (chat suggestion, admin panel). */
  help?: string;
  /** Parsed and checked in order before the handler runs; a `longString` takes the rest of the line and comes last. */
  params?: P;
  /**
   * Who may use it (checked on the server, the console always may): false (default) everyone; true ai-core admins
   * (ACE `ai.admin`); an ace (`ai.admin`) or principal (`group.admin`, `ai.job.police`) or a list of them: players
   * allowed any. ai-core grants `command.<name>` to listed principals; `command.<name>` always allows (server.cfg, txAdmin).
   */
  restricted?: boolean | string | string[];
}

/** `source` is 0 for the server console; `raw` is the whole typed line. A thrown error or rejection is logged. */
export type CommandHandler<P extends readonly CommandParam[]> = (source: number, args: CommandArgs<P>, raw: string) => unknown;

// The error texts are ai-core's (generic words), in the `ai:locale` language; loaded on the first error.
let texts: Record<string, string> | null = null;
const t = (key: string, ...args: Array<string | number>): string => formatText((texts ??= loadLocaleTexts(CORE.resource))[key] ?? key, args);

/** A command answer: an ai-core notification for a player, a console line for the server. */
function reply(source: number, text: string, kind: NotificationKind): void {
  if (source > 0) notify(source, text, kind);
  else log.info(text);
}

class Command {
  readonly info: CommandInfo;
  private readonly usage: string;

  constructor(
    names: string[],
    private readonly params: readonly CommandParam[],
    help: string,
    aces: string[] | null,
    private readonly handler: (source: number, args: Record<string, unknown>, raw: string) => unknown,
  ) {
    this.info = { names, help, params: params.map((p) => ({ ...p })), aces };
    this.usage = [`/${names[0]}`, ...params.map((p) => (p.optional ? `[${p.name}]` : `<${p.name}>`))].join(" ");
  }

  /** Whether `source` may run it under `name` (the console always may). */
  allowed(source: number, name: string): boolean {
    const aces = this.info.aces;
    if (source <= 0 || !aces) return true;
    const player = String(source);
    return aces.some((ace) => IsPlayerAceAllowed(player, ace)) || Boolean(IsPlayerAceAllowed(player, `command.${name}`));
  }

  suggestion(name: string): { name: string; help: string; params: Array<{ name: string; help: string }> } {
    return { name: `/${name}`, help: this.info.help, params: this.params.map((p) => ({ name: p.name, help: p.help ?? "" })) };
  }

  run(source: number, name: string, raw: string[], line: string): void {
    if (!this.allowed(source, name)) return reply(source, t("COMMAND_NOT_ALLOWED"), "error");
    const args = this.parse(raw);
    if (typeof args === "string") {
      reply(source, args, "error");
      return reply(source, t("COMMAND_USAGE", this.usage), "info");
    }
    const fail = (error: unknown) => log.error(`command /${name} failed`, error);
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
      const token = param.type === "longString" ? raw.slice(i).join(" ").trim() : (raw[i] ?? "");
      if (token === "") {
        if (!param.optional) return t("COMMAND_MISSING", param.name);
        continue;
      }
      if (param.type === "number" || param.type === "playerId") {
        const value = Number(token);
        if (!Number.isFinite(value)) return t("COMMAND_NUMBER", param.name);
        if (param.type === "playerId" && (!Number.isInteger(value) || value <= 0 || !GetPlayerName(String(value)))) return t("COMMAND_PLAYER", token);
        args[param.name] = value;
      } else args[param.name] = token;
      if (param.type === "longString") break;
    }
    return args;
  }
}

/**
 * This resource's commands: announces them to ai-core (one call per tick of additions) and keeps each player's chat
 * suggestions as a delta of the commands they may use (sent when a character loads, after job or gang changes, and
 * to everyone online when commands are added; removed for everyone when the resource stops).
 */
class CommandSet {
  private readonly list: Command[] = [];
  private readonly sent = new Map<number, Set<string>>();
  private announced = 0;
  private queued = false;
  private listening = false;

  add(command: Command): void {
    if (!this.listening) this.listen();
    this.list.push(command);
    if (this.queued) return;
    this.queued = true;
    setImmediate(() => this.flush());
  }

  /** Sends `source` the suggestions they gained and removes the ones they lost. */
  refresh(source: number): void {
    const before = this.sent.get(source);
    const now = new Set<string>();
    const add: Array<ReturnType<Command["suggestion"]>> = [];
    for (const command of this.list) {
      for (const name of command.info.names) {
        if (!command.allowed(source, name)) continue;
        now.add(name);
        if (!before?.has(name)) add.push(command.suggestion(name));
      }
    }
    this.sent.set(source, now);
    if (add.length) emitNet("chat:addSuggestions", source, add);
    if (before) for (const name of before) if (!now.has(name)) emitNet("chat:removeSuggestion", source, `/${name}`);
  }

  private flush(): void {
    this.queued = false;
    optionalExport(CORE.resource)?.RegisterCommands(
      resource,
      this.list.slice(this.announced).map((c) => c.info),
    );
    this.announced = this.list.length;
    for (const player of getPlayers()) this.refresh(Number(player));
  }

  private listen(): void {
    this.listening = true;
    const refresh = (source: number) => this.refresh(Number(source));
    on(CORE.playerLoadedEvent, refresh);
    // Job and gang grades are ACL principals: a command restricted to `ai.job.police` follows them.
    on(CORE.jobsChangedEvent, refresh);
    on(CORE.gangsChangedEvent, refresh);
    on("playerDropped", () => this.sent.delete(Number(globalThis.source)));
    on("onResourceStop", (name: string) => {
      if (name !== resource) return;
      for (const command of this.list) for (const n of command.info.names) emitNet("chat:removeSuggestion", -1, `/${n}`);
    });
  }
}

const commands = new CommandSet();

/**
 * Registers a server command (an array name adds aliases). Arguments are parsed and checked against `params` before
 * the handler runs; wrong input shows the error and the usage line to the player. The permission is checked here
 * with ACE (`restricted`), chat suggestions go only to players allowed to use it, and ai-core's panel lists it.
 *
 *   addCommand("tp", { help: t("CMD_TP"), restricted: true, params: [{ name: "id", type: "playerId" }] }, (src, { id }) => ...);
 */
export function addCommand<const P extends readonly CommandParam[] = readonly []>(
  name: string | string[],
  options: CommandOptions<P>,
  handler: CommandHandler<P>,
): void {
  const names = (Array.isArray(name) ? name : [name]).map((n) => n.toLowerCase());
  if (names.length === 0) throw new Error("addCommand needs a name");
  const restricted = options.restricted ?? false;
  const aces = restricted === false ? null : restricted === true ? [ADMIN.ace] : Array.isArray(restricted) ? [...restricted] : [restricted];
  const command = new Command(names, options.params ?? [], options.help ?? "", aces, handler as (source: number, args: Record<string, unknown>, raw: string) => unknown);
  // Registered unrestricted: the permission is ours (ACE list + `command.<name>`), so a refusal can say why.
  for (const n of names) RegisterCommand(n, (source: number, raw: string[], line: string) => command.run(Number(source), n, raw, line), false);
  commands.add(command);
}
