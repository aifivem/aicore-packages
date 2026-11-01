import { resourceExport } from "../fivem/exports";
import {
  CORE,
  type CharacterResult,
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

  /**
   * Registers a job of the calling resource (gone when it stops, never saved to the panel); refused with an ai-core
   * lang key when the panel has a job of that name or another resource registered it.
   */
  registerJob(name: string, definition: JobDefinition): CharacterResult {
    return core.RegisterJobDefinition(name, definition);
  }

  /** Removes a job this resource registered; false otherwise. */
  removeJob(name: string): boolean {
    return core.RemoveJobDefinition(name);
  }

  /** Registers a gang of the calling resource, like `registerJob`. */
  registerGang(name: string, definition: GangDefinition): CharacterResult {
    return core.RegisterGangDefinition(name, definition);
  }

  /** Removes a gang this resource registered; false otherwise. */
  removeGang(name: string): boolean {
    return core.RemoveGangDefinition(name);
  }

  gang(name: string): GangDefinition | null {
    let def = this.gangs.get(name);
    if (def === undefined)
      this.gangs.set(name, (def = core.GetGangDefinition(name) ?? null));
    return def;
  }
}

export const definitions = new Definitions();
