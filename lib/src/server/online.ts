import { isPublic, type AccessRule } from "../shared/access";
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
  jobs: readonly JobMembership[];
  jobNames: readonly string[];
  gangs: readonly GangMembership[];
  gangNames: readonly string[];
  duty: string | null;
}

/** Moves a player between the member sets of `index` from the `before` names to the `after` names. */
function reindex(
  index: Map<string, Set<number>>,
  source: number,
  before: readonly string[],
  after: readonly string[],
): void {
  for (const name of before) {
    const set = index.get(name);
    if (!set) continue;
    set.delete(source);
    if (set.size === 0) index.delete(name);
  }
  for (const name of after) {
    let set = index.get(name);
    if (!set) index.set(name, (set = new Set()));
    set.add(source);
  }
}

/**
 * This resource's mirror of ai-core's loaded players: characters, job and gang memberships (with grades), member sets
 * per job and gang, and duty, read once from ai-core's exports on first use and then kept by its local events. Hot
 * paths (every chat message, every alert, every stash open) read it instead of copying ai-core's player data through
 * an export (10k players = 10k export calls per message).
 */
class OnlinePlayers {
  private readonly players = new Map<number, OnlinePlayer>();
  private readonly onDuty = new Map<string, Set<number>>();
  private readonly jobIndex = new Map<string, Set<number>>();
  private readonly gangIndex = new Map<string, Set<number>>();
  private started = false;

  private start(): void {
    if (this.started) return;
    this.started = true;
    // Memberships and duty of a loaded character are read once from ai-core (one player, at load), then follow its deltas.
    const load = (source: number, character: CharacterInfo): void => {
      this.drop(source);
      this.players.set(source, {
        character,
        jobs: [],
        jobNames: [],
        gangs: [],
        gangNames: [],
        duty: null,
      });
      this.setJobs(source, core.GetJobs(source) ?? []);
      this.setGangs(source, core.GetGangs(source) ?? []);
      this.setDuty(source, core.GetDutyJob(source));
    };
    on(CORE.playerLoadedEvent, load);
    on(CORE.playerUnloadedEvent, (source: number) => this.drop(source));
    on(CORE.jobsChangedEvent, (source: number, jobs: JobMembership[]) =>
      this.setJobs(source, jobs),
    );
    on(CORE.gangsChangedEvent, (source: number, gangs: GangMembership[]) =>
      this.setGangs(source, gangs),
    );
    on(CORE.dutyChangedEvent, (source: number, job: string | null) =>
      this.setDuty(source, job),
    );
    for (const source of core.GetLoadedSources()) {
      const character = core.GetCharacter(source);
      if (character) load(source, character);
    }
  }

  private drop(source: number): void {
    const player = this.players.get(source);
    if (!player) return;
    this.setDuty(source, null);
    reindex(this.jobIndex, source, player.jobNames, []);
    reindex(this.gangIndex, source, player.gangNames, []);
    this.players.delete(source);
  }

  private setJobs(source: number, jobs: readonly JobMembership[]): void {
    const player = this.players.get(source);
    if (!player) return;
    const names = jobs.map((m) => m.job);
    reindex(this.jobIndex, source, player.jobNames, names);
    player.jobs = jobs;
    player.jobNames = names;
  }

  private setGangs(source: number, gangs: readonly GangMembership[]): void {
    const player = this.players.get(source);
    if (!player) return;
    const names = gangs.map((m) => m.gang);
    reindex(this.gangIndex, source, player.gangNames, names);
    player.gangs = gangs;
    player.gangNames = names;
  }

  private setDuty(source: number, job: string | null): void {
    const player = this.players.get(source);
    if (!player) return;
    if (player.duty) {
      const set = this.onDuty.get(player.duty);
      set?.delete(source);
      if (set?.size === 0) this.onDuty.delete(player.duty);
    }
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

  /** The character's "Firstname Lastname", else the FiveM player name ("" with `fallback: false`). */
  name(source: number, options: { fallback?: boolean } = {}): string {
    const c = this.character(source);
    if (c) return `${c.firstname} ${c.lastname}`;
    return options.fallback === false ? "" : GetPlayerName(String(source));
  }

  /** Job names of a player (every membership, on duty or not). */
  jobs(source: number): readonly string[] {
    this.start();
    return this.players.get(source)?.jobNames ?? [];
  }

  /** Gang names of a player. */
  gangs(source: number): readonly string[] {
    this.start();
    return this.players.get(source)?.gangNames ?? [];
  }

  /** The player's grade in a job, or null when not a member. */
  jobGrade(source: number, job: string): number | null {
    this.start();
    return (
      this.players.get(source)?.jobs.find((m) => m.job === job)?.grade ?? null
    );
  }

  /** The player's grade in a gang, or null when not a member. */
  gangGrade(source: number, gang: string): number | null {
    this.start();
    return (
      this.players.get(source)?.gangs.find((m) => m.gang === gang)?.grade ??
      null
    );
  }

  /** Players with a membership in the job, on duty or not (a live set: copy before awaiting). */
  jobMembers(job: string): ReadonlySet<number> {
    this.start();
    return this.jobIndex.get(job) ?? EMPTY;
  }

  /** Players in the gang (a live set: copy before awaiting). */
  gangMembers(gang: string): ReadonlySet<number> {
    this.start();
    return this.gangIndex.get(gang) ?? EMPTY;
  }

  /** The job a player is on duty for, or null. */
  dutyJob(source: number): string | null {
    this.start();
    return this.players.get(source)?.duty ?? null;
  }

  /** Whether the player is on duty for one of `jobs` (police jobs, EMS jobs). */
  onDutyIn(source: number, jobs: readonly string[]): boolean {
    const duty = this.dutyJob(source);
    return duty !== null && jobs.includes(duty);
  }

  /** Whether the player may use a place with this access rule (lib `AccessRule`; the client's `allows` decides the same). */
  allows(source: number, rule: AccessRule): boolean {
    if (isPublic(rule)) return true;
    const min = (name: string) => rule.grades[name] ?? 0;
    for (const gang of rule.gangs) {
      const grade = this.gangGrade(source, gang);
      if (grade !== null && grade >= min(gang)) return true;
    }
    const duty = rule.onDuty ? this.dutyJob(source) : null;
    for (const job of rule.jobs) {
      const grade = this.jobGrade(source, job);
      if (grade !== null && grade >= min(job) && (!rule.onDuty || duty === job))
        return true;
    }
    return false;
  }

  /** How many players are on duty over several jobs (O(jobs)). */
  countOnDuty(jobs: readonly string[]): number {
    this.start();
    let count = 0;
    for (const job of jobs) count += this.onDuty.get(job)?.size ?? 0;
    return count;
  }

  /** Players on duty for a job (a live set: copy before awaiting). */
  onDutyFor(job: string): ReadonlySet<number> {
    this.start();
    return this.onDuty.get(job) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();

export const online = new OnlinePlayers();
