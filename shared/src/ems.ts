/** A distress call of a downed player to the medics (lib `ems.distress`); texts already translated. */
export interface DistressCall {
  /** Jobs whose on-duty members get it (the script's EMS jobs). */
  jobs: string[];
  /** One more line ("Unconscious"). */
  message?: string;
}

/**
 * One EMS source or sink behind ai-core's EMS layer (server side). Each part is optional: what the active adapter
 * lacks, ai-core answers itself (on-duty members from its duty counts, the distress call as an alert to the jobs
 * through the dispatch layer).
 */
export interface EmsAdapter {
  resource: string;
  /** The version the adapter is written for; ai-core warns when another one runs. Absent for ai-core's own part. */
  version?: string;
  /** Medics free to take a call in `jobs` (a dispatch script leaves busy ones out). */
  available?(jobs: readonly string[]): number;
  /** Sends a distress call for the player; false when it was refused. */
  distress?(source: number, call: DistressCall): boolean;
}

/** A distress call from untrusted input; null without jobs. */
export function toDistressCall(value: unknown): DistressCall | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const v = value as Record<string, unknown>;
  const jobs = Array.isArray(v.jobs)
    ? v.jobs
        .filter((j): j is string => typeof j === "string" && j.length <= 32)
        .slice(0, 10)
    : [];
  if (!jobs.length) return null;
  const message =
    typeof v.message === "string" && v.message.trim()
      ? v.message.trim().slice(0, 160)
      : undefined;
  return { jobs, message };
}

/** ai-core's EMS exports: the medics available and distress calls, whatever EMS script runs. */
export type EmsServerExports = {
  /** The EMS source the layer uses ("ai-core" for ai-core's own duty counts). */
  GetEmsSystem(): string | null;
  /** Medics free to take a call in `jobs`. */
  GetAvailableMedics(jobs: string[]): number;
  /** Sends a distress call for a player to the medics; false when nothing took it. */
  SendDistress(source: number, call: DistressCall): boolean;
};
