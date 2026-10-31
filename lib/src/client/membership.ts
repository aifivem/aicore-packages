import { decideAccess, type AccessRule } from "../shared/access";
import type { GangMembership, JobMembership } from "@aicore-fivem/shared";
import { getPlayerData, onPlayerData } from "./playerData";

/** Whether the player holds one of `jobs` at `minGrade` or above (on duty or not). Empty list: everyone. */
export function hasJob(jobs: readonly string[], minGrade = 0): boolean {
  if (jobs.length === 0) return true;
  const list: readonly JobMembership[] = getPlayerData("jobs") ?? [];
  return list.some((m) => jobs.includes(m.job) && m.grade >= minGrade);
}

/** Whether the player is in one of `gangs` at `minGrade` or above. Empty list: everyone. */
export function inGang(gangs: readonly string[], minGrade = 0): boolean {
  if (gangs.length === 0) return true;
  const list: readonly GangMembership[] = getPlayerData("gangs") ?? [];
  return list.some((m) => gangs.includes(m.gang) && m.grade >= minGrade);
}

/** Whether the player is on duty in one of `jobs`. */
export function onDutyIn(jobs: readonly string[]): boolean {
  const duty = getPlayerData("duty");
  return typeof duty === "string" && jobs.includes(duty);
}

/** Calls `fn` when the player's jobs, duty or gangs change (refresh points whose `canShow` reads them). */
export function onMembershipChange(fn: () => void): void {
  onPlayerData("jobs", fn);
  onPlayerData("duty", fn);
  onPlayerData("gangs", fn);
}

/** Whether the local player may use a place with this access rule (the server's `online.allows` decides the same). */
export function allows(rule: AccessRule): boolean {
  const duty = getPlayerData("duty");
  return decideAccess(
    rule,
    getPlayerData("jobs") ?? [],
    getPlayerData("gangs") ?? [],
    typeof duty === "string" ? duty : null,
  );
}
