import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Routing buckets from ai-core's allocator: no two scripts ever share one; never `base + n` per script. */
export const buckets = {
  /** A free bucket for this resource (no population, strict lockdown); `tag` names it in logs ("property:12"). */
  acquire: (tag: string): number => core.AcquireBucket(tag),
  /** Gives a bucket back once its players are out; every bucket of a stopped resource goes back by itself. */
  release: (id: number): boolean => core.ReleaseBucket(id),
};
