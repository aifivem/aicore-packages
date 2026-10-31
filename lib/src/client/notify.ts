import { LIB_UI, type NotificationKind } from "@aicore-fivem/shared";
import { resourceExport } from "../fivem/exports";

const ui = resourceExport(LIB_UI.resource);

/** Shows a notification card on this player's screen (ai-lib draws it); `text` is already translated. */
export function notify(
  text: string,
  kind: NotificationKind = "info",
  duration?: number,
): void {
  ui.Notify({ text, kind, duration });
}
