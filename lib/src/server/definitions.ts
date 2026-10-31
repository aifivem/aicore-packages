import { resourceExport } from "../fivem/exports";
import {
  CORE,
  type GangDefinition,
  type JobDefinition,
} from "@aicore-fivem/shared";

const core = resourceExport("ai-core");

/**
 * ai-core's job / gang definitions for any resource: each fetched once from ai-core, forgotten when the panel
 * changes it (`CORE.definitionsChangedEvent`), so a read is a Map lookup, not an export copy.
 */
class Definitions {
  private readonly jobs = new Map<string, JobDefinition | null>();
  private readonly gangs = new Map<string, GangDefinition | null>();

  constructor() {
    on(CORE.definitionsChangedEvent, (file: unknown, name: unknown) => {
      if (typeof name !== "string") return;
      if (file === "jobs") this.jobs.delete(name);
      else if (file === "gangs") this.gangs.delete(name);
    });
  }

  job(name: string): JobDefinition | null {
    let def = this.jobs.get(name);
    if (def === undefined)
      this.jobs.set(name, (def = core.GetJobDefinition(name) ?? null));
    return def;
  }

  gang(name: string): GangDefinition | null {
    let def = this.gangs.get(name);
    if (def === undefined)
      this.gangs.set(name, (def = core.GetGangDefinition(name) ?? null));
    return def;
  }
}

export const definitions = new Definitions();
