import type { GangDefinition, JobDefinition } from "../definitions";
import type { GangMembership, JobMembership } from "../player";

/** ai-core's job and gang exports: memberships, duty, definitions (part of `AiCoreServerExports`). */
export type CoreGroupServerExports = {
  GetJobs(src: number): JobMembership[] | null;
  GetCurrentJob(src: number): JobMembership | null;
  GetDutyJob(src: number): string | null;
  SetDuty(src: number, job: string | null): boolean;
  SetJob(src: number, job: string, grade: number): boolean;
  RemoveJob(src: number, job: string): boolean;
  GetOnDutyCount(job: string): number;
  /** Whether it is prime time for `job` (the default hours without one): tgiann-policealert's hours while it runs, else ai-core's panel hours. */
  IsPrimeTime(job?: string): boolean;

  GetGangs(src: number): GangMembership[] | null;
  GetActiveGang(src: number): string | null;
  SetGang(src: number, gang: string, grade: number): boolean;
  RemoveGang(src: number, gang: string): boolean;
  SetActiveGang(src: number, gang: string | null): boolean;

  /** Every job definition (a copy of the whole map: for rare reads; one job is `GetJobDefinition`). */
  GetJobDefinitions(): Record<string, JobDefinition>;
  GetGangDefinitions(): Record<string, GangDefinition>;
  GetJobDefinition(job: string): JobDefinition | null;
  GetGangDefinition(gang: string): GangDefinition | null;
};
