import type { DataSpec, WidgetSpec } from "@aicore-fivem/shared";
import { bool, record } from "./read";

/**
 * Who may use a place: one of `jobs` (each at its `grades` minimum, on duty in it with `onDuty`) or one of `gangs`
 * (at its minimum grade). Both lists empty: everyone. Read from a record's own fields (`jobs`, `gangs`, `grades`,
 * `onDuty`), so the client's check (`allows`) and the server's (`online.allows`) use the same rule.
 */
export interface AccessRule {
  jobs: string[];
  gangs: string[];
  /** Minimum grade per job or gang name (missing: 0). */
  grades: Record<string, number>;
  onDuty: boolean;
}

const names = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** A record's access rule (missing fields: everyone). */
export function readAccess(value: unknown): AccessRule {
  const v = record(value);
  const grades: Record<string, number> = {};
  for (const [name, grade] of Object.entries(record(v.grades)))
    if (typeof grade === "number" && Number.isInteger(grade) && grade >= 0)
      grades[name] = grade;
  return {
    jobs: names(v.jobs),
    gangs: names(v.gangs),
    grades,
    onDuty: bool(v.onDuty, false),
  };
}

/** Whether the rule lets everyone in. */
export const isPublic = (rule: AccessRule): boolean =>
  rule.jobs.length === 0 && rule.gangs.length === 0;

/** The panel data spec of the access fields, spread into a records file's sections. */
export const ACCESS_FIELDS: Record<string, DataSpec> = {
  jobs: { type: "names", lookup: "job", optional: true },
  gangs: { type: "names", lookup: "gang", optional: true },
  onDuty: { type: "bool", optional: true },
};

/** The panel fields of the access rule (labels and hints are ai-core's generic panel texts). */
export function accessFields(): WidgetSpec[] {
  return [
    {
      widget: "tags",
      lookup: "job",
      path: "jobs",
      label: "ADMIN_F_ACCESS_JOBS",
      hint: "ADMIN_H_ACCESS_JOBS",
      placeholder: "ADMIN_P_ACCESS_JOBS",
    },
    {
      widget: "tags",
      lookup: "gang",
      path: "gangs",
      label: "ADMIN_F_ACCESS_GANGS",
      hint: "ADMIN_H_ACCESS_GANGS",
      placeholder: "ADMIN_P_ACCESS_GANGS",
    },
    {
      widget: "switch",
      path: "onDuty",
      label: "ADMIN_F_ACCESS_ON_DUTY",
      hint: "ADMIN_H_ACCESS_ON_DUTY",
    },
  ];
}

/**
 * The rule's decision from a player's memberships (the shared core of the client's `allows` and the server's
 * `online.allows`).
 */
export function decideAccess(
  rule: AccessRule,
  jobs: ReadonlyArray<{ job: string; grade: number }>,
  gangs: ReadonlyArray<{ gang: string; grade: number }>,
  dutyJob: string | null,
): boolean {
  if (isPublic(rule)) return true;
  const min = (name: string) => rule.grades[name] ?? 0;
  if (gangs.some((g) => rule.gangs.includes(g.gang) && g.grade >= min(g.gang)))
    return true;
  return jobs.some(
    (j) =>
      rule.jobs.includes(j.job) &&
      j.grade >= min(j.job) &&
      (!rule.onDuty || dutyJob === j.job),
  );
}
