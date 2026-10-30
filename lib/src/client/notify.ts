import { CORE, type NotificationKind } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const core = resourceExport(CORE.resource);

/** Shows a notification card on this player's screen (ai-core draws it); `text` is already translated. */
export function notify(
  text: string,
  kind: NotificationKind = "info",
  duration?: number,
): void {
  core.Notify({ text, kind, duration });
}
