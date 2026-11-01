import type { CharacterInfo } from "@aicore-fivem/shared";
import { isPublic, type AccessRule } from "../../shared/access";
import { OnlineMirror, type JobStateChange } from "./mirror";

export type { JobStateChange } from "./mirror";

/**
 * This resource's mirror of ai-core's loaded players: characters, job and gang memberships (with grades), member sets
 * per job and gang, and duty, read once from ai-core's exports on first use and then kept by its local events. Hot
 * paths (every chat message, every alert, every stash open) read it instead of copying ai-core's player data through
 * an export (10k players = 10k export calls per message).
 */
class OnlinePlayers extends OnlineMirror {
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

  /** The server id of a loaded character by its citizenid, or null. */
  sourceOf(citizenid: string): number | null {
    this.start();
    return this.byCitizenid.get(citizenid) ?? null;
  }

  /** Every loaded character by server id (a copy). */
  characters(): Map<number, CharacterInfo> {
    this.start();
    const out = new Map<number, CharacterInfo>();
    for (const [source, player] of this.players)
      out.set(source, player.character);
    return out;
  }

  /** The id of the player's loaded character, undefined when none. */
  charId(source: number): number | undefined {
    this.start();
    return this.players.get(source)?.character.id;
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

  /** How many players hold one of the jobs (a player in two of them counts once), or with `onlyOnDuty` are on duty in one. */
  countMembers(jobs: readonly string[], onlyOnDuty = false): number {
    if (onlyOnDuty) return this.countOnDuty(jobs);
    this.start();
    // a player in several of the jobs is counted at the first one (no set allocated)
    let count = 0;
    for (let i = 0; i < jobs.length; i++) {
      const set = this.jobIndex.get(jobs[i]!);
      if (!set) continue;
      count += set.size;
      if (i === 0) continue;
      for (const source of set)
        for (let k = 0; k < i; k++)
          if (this.jobIndex.get(jobs[k]!)?.has(source)) {
            count--;
            break;
          }
    }
    return count;
  }

  /** Server ids of the players holding one of the jobs (or with `onlyOnDuty` on duty in one), each once. */
  membersOf(jobs: readonly string[], onlyOnDuty = false): number[] {
    this.start();
    const index = onlyOnDuty ? this.onDuty : this.jobIndex;
    if (jobs.length === 1) return [...(index.get(jobs[0]!) ?? EMPTY)];
    const seen = new Set<number>();
    for (const job of jobs)
      for (const source of index.get(job) ?? EMPTY) seen.add(source);
    return [...seen];
  }

  /**
   * Calls `listener` when a loaded player's jobs or duty change, once at each load (`previous` empty) and at each
   * unload (`online` false); the players already loaded when it subscribes are not replayed (read `sources()`).
   * Returns the unsubscribe.
   */
  onJobState(listener: (change: JobStateChange) => void): () => void {
    this.start();
    this.jobListeners.add(listener);
    return () => this.jobListeners.delete(listener);
  }

  /** Players on duty for a job (a live set: copy before awaiting). */
  onDutyFor(job: string): ReadonlySet<number> {
    this.start();
    return this.onDuty.get(job) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();

export const online = new OnlinePlayers();
