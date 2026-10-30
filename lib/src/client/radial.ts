import { CORE, type RadialItem } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/**
 * Items on whichever radial menu runs (ai-radialmenu, or another through ai-core's radial layer). ai-core keeps them
 * across radial restarts and drops them when this resource stops: add once at start, no re-adding on a radial start.
 */
export const radial = {
  /** Adds or replaces an item (`parent` puts it into a sub menu such as `RADIAL_VEHICLE`). */
  add: (item: RadialItem): void => core.AddRadialItem(item),
  remove: (id: string): void => core.RemoveRadialItem(id),
  /** Reads every `canShow` of an open wheel again (after what they read changed). */
  refresh: (): void => core.RefreshRadial(),
};
