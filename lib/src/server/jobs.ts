import {
  CORE,
  type GangMembership,
  type JobMembership,
} from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Jobs and gangs of a loaded player through ai-core (several per character, one on duty, one active gang). Reads for
 * many players at once are lib `online` (a mirror), this is for the player an action is about.
 */
export const jobs = {
  /** The job other scripts see as "the" job: on duty, else last on duty, else the first, else unemployed. */
  current: (source: number): JobMembership | null => core.GetCurrentJob(source),
  /** Every job of the player. */
  list: (source: number): JobMembership[] => core.GetJobs(source) ?? [],
  /** The job the player is on duty in, or null. */
  duty: (source: number): string | null => core.GetDutyJob(source),
  /** On duty in `job` (one of theirs), or off duty with null; false when refused. */
  setDuty: (source: number, job: string | null): boolean =>
    core.SetDuty(source, job),
  /** Adds or regrades a job under the panel's job rules (`maxJobs`, `multiJob`). */
  set: (source: number, job: string, grade: number): boolean =>
    core.SetJob(source, job, grade),
  remove: (source: number, job: string): boolean => core.RemoveJob(source, job),
  /** The job of a character without one (the panel's setting). */
  unemployed: (): string => core.GetUnemployedJob(),
  /** How many players are on duty in a job. */
  onDutyCount: (job: string): number => core.GetOnDutyCount(job),
  /** Every gang of the player. */
  gangs: (source: number): GangMembership[] => core.GetGangs(source) ?? [],
  /** The player's active gang, or null. */
  activeGang: (source: number): string | null => core.GetActiveGang(source),
  setActiveGang: (source: number, gang: string | null): boolean =>
    core.SetActiveGang(source, gang),
  setGang: (source: number, gang: string, grade: number): boolean =>
    core.SetGang(source, gang, grade),
  removeGang: (source: number, gang: string): boolean =>
    core.RemoveGang(source, gang),
};
