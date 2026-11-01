import {
  CORE,
  type CharacterInfo,
  type GangMembership,
  type JobMembership,
} from "@aicore-fivem/shared";
import { resourceExport } from "../../fivem/exports";

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

/** The loaded players and their member sets, read from ai-core once on first use and then kept by its local events. */
export class OnlineMirror {
  protected readonly players = new Map<number, OnlinePlayer>();
  protected readonly onDuty = new Map<string, Set<number>>();
  protected readonly jobIndex = new Map<string, Set<number>>();
  protected readonly gangIndex = new Map<string, Set<number>>();
  /** citizenid -> server id of each loaded character. */
  protected readonly byCitizenid = new Map<string, number>();
  private started = false;

  protected start(): void {
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
      this.byCitizenid.set(character.citizenid, source);
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
    this.byCitizenid.delete(player.character.citizenid);
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
}
