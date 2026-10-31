import { CORE } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** The local player's seat belt through ai-core, whatever seat belt script runs (ai-smallresources, a HUD's own). */
export const seatbelt = {
  /** Whether the belt is on; null when no seat belt script answers (on demand, not per frame). */
  isOn: (): boolean | null => core.GetSeatbelt(),
  /** `fn(worn)` when the belt changes, from scripts that tell changes (ai-smallresources, qbx_seatbelt). */
  onChange(fn: (worn: boolean | null) => void): void {
    on(CORE.clientSeatbeltEvent, (worn: unknown) =>
      fn(typeof worn === "boolean" ? worn : null),
    );
  },
  /** The seat belt script that answers, or null. */
  provider: (): string | null => core.GetSeatbeltProvider(),
};
