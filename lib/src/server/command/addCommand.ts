import { ADMIN, type CommandParam } from "@aicore-fivem/shared";
import { Command } from "./command";
import { commands } from "./commandSet";

type Value<P extends CommandParam> = P["type"] extends "number" | "playerId"
  ? number
  : string;

/** The handler's `args`: one value per param by name, `undefined` for a missing optional one. */
export type CommandArgs<P extends readonly CommandParam[]> = {
  [K in P[number] as K["name"]]: K["optional"] extends true
    ? Value<K> | undefined
    : Value<K>;
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
export type CommandHandler<P extends readonly CommandParam[]> = (
  source: number,
  args: CommandArgs<P>,
  raw: string,
) => unknown;

/**
 * Registers a server command (an array name adds aliases). Arguments are parsed and checked against `params` before
 * the handler runs; wrong input shows the error and the usage line to the player. The permission is checked here
 * with ACE (`restricted`), chat suggestions go only to players allowed to use it, and ai-core's panel lists it.
 *
 *   addCommand("tp", { help: t("CMD_TP"), restricted: true, params: [{ name: "id", type: "playerId" }] }, (src, { id }) => ...);
 */
export function addCommand<
  const P extends readonly CommandParam[] = readonly [],
>(
  name: string | string[],
  options: CommandOptions<P>,
  handler: CommandHandler<P>,
): void {
  const names = (Array.isArray(name) ? name : [name]).map((n) =>
    n.toLowerCase(),
  );
  if (names.length === 0) throw new Error("addCommand needs a name");
  const restricted = options.restricted ?? false;
  const aces =
    restricted === false
      ? null
      : restricted === true
        ? [ADMIN.ace]
        : Array.isArray(restricted)
          ? [...restricted]
          : [restricted];
  const command = new Command(
    names,
    options.params ?? [],
    options.help ?? "",
    aces,
    handler as (
      source: number,
      args: Record<string, unknown>,
      raw: string,
    ) => unknown,
  );
  // Registered unrestricted: the permission is ours (ACE list + `command.<name>`), so a refusal can say why.
  for (const n of names)
    RegisterCommand(
      n,
      (source: number, raw: string[], line: string) =>
        command.run(Number(source), n, raw, line),
      false,
    );
  commands.add(command);
}
