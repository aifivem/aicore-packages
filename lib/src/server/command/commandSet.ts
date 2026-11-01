import { CORE } from "@aicore-fivem/shared";
import { optionalExport } from "../../fivem/exports";
import type { Command } from "./command";

const resource = GetCurrentResourceName();

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
    if (before)
      for (const name of before)
        if (!now.has(name))
          emitNet("chat:removeSuggestion", source, `/${name}`);
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
      for (const command of this.list)
        for (const n of command.info.names)
          emitNet("chat:removeSuggestion", -1, `/${n}`);
    });
  }
}

export const commands = new CommandSet();
