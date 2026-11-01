import {
  LIB_UI,
  type Notification,
  type NotificationKind,
} from "@aicore-fivem/shared";

/** Shows a notification card on one player's screen (ai-lib draws it, `title` above the text); texts are already translated. */
export function notify(
  source: number,
  text: string,
  kind: NotificationKind = "info",
  duration?: number,
  title?: string,
): void {
  const notification: Notification = { text, kind, duration, title };
  emitNet(LIB_UI.notifyEvent, source, notification);
}
