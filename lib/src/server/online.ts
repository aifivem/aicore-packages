import {
  CORE,
  type CharacterInfo,
  type GangMembership,
  type JobMembership,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** What a resource keeps of one loaded player. */
interface OnlinePlayer {
  character: CharacterInfo;
  jobs: readonly string[];
  gangs: readonly string[];
  duty: string | null;
}

/**
 * This resource's mirror of ai-core's loaded players: characters, job and gang names and duty, read once from ai-core's
 * exports on first use and then kept by its local events. Hot paths (every chat message, every alert) read it
 * instead of copying ai-core's whole player list through an export (10k players = 10k export calls per message).
 */
class OnlinePlayers {
  private readonly players = new Map<number, OnlinePlayer>();
  private readonly onDuty = new Map<string, Set<number>>();
  private started = false;

  private start(): void {
    if (this.started) return;
    this.started = true;
    // Memberships and duty of a loaded character are read once from ai-core (one player, at load), then follow its deltas.
    const load = (source: number, character: CharacterInfo): void => {
      this.put(
        source,
        character,
        (core.GetJobs(source) ?? []).map((m) => m.job),
        (core.GetGangs(source) ?? []).map((m) => m.gang),
      );
      this.setDuty(source, core.GetDutyJob(source));
    };
    on(CORE.playerLoadedEvent, load);
    on(CORE.playerUnloadedEvent, (source: number) => this.drop(source));
    on(CORE.jobsChangedEvent, (source: number, jobs: JobMembership[]) => {
      const player = this.players.get(source);
      if (player) player.jobs = jobs.map((m) => m.job);
    });
    on(CORE.gangsChangedEvent, (source: number, gangs: GangMembership[]) => {
      const player = this.players.get(source);
      if (player) player.gangs = gangs.map((m) => m.gang);
    });
    on(CORE.dutyChangedEvent, (source: number, job: string | null) =>
      this.setDuty(source, job),
    );
    for (const source of core.GetLoadedSources()) {
      const character = core.GetCharacter(source);
      if (character) load(source, character);
    }
  }

  private put(
    source: number,
    character: CharacterInfo,
    jobs: readonly string[],
    gangs: readonly string[],
  ): void {
    this.drop(source);
    this.players.set(source, { character, jobs, gangs, duty: null });
  }

  private drop(source: number): void {
    this.setDuty(source, null);
    this.players.delete(source);
  }

  private setDuty(source: number, job: string | null): void {
    const player = this.players.get(source);
    if (!player) return;
    if (player.duty) this.onDuty.get(player.duty)?.delete(source);
    player.duty = job;
    if (!job) return;
    let set = this.onDuty.get(job);
    if (!set) this.onDuty.set(job, (set = new Set()));
    set.add(source);
  }

  /** Server ids of every player with a loaded character. */
  sources(): IterableIterator<number> {
    this.start();
    return this.players.keys();
  }

  /** How many players have a loaded character. */
  get size(): number {
    this.start();
    return this.players.size;
  }

  /** The loaded character of a player, or null. */
  character(source: number): CharacterInfo | null {
    this.start();
    return this.players.get(source)?.character ?? null;
  }

  /** Job names of a player (every membership, on duty or not). */
  jobs(source: number): readonly string[] {
    this.start();
    return this.players.get(source)?.jobs ?? [];
  }

  /** Gang names of a player. */
  gangs(source: number): readonly string[] {
    this.start();
    return this.players.get(source)?.gangs ?? [];
  }

  /** The job a player is on duty for, or null. */
  dutyJob(source: number): string | null {
    this.start();
    return this.players.get(source)?.duty ?? null;
  }

  /** Players on duty for a job (a live set: copy before awaiting). */
  onDutyFor(job: string): ReadonlySet<number> {
    this.start();
    return this.onDuty.get(job) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();

export const online = new OnlinePlayers();
