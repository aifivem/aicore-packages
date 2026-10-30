import {
  CORE,
  type Notification,
  type NotificationKind,
} from "@aicore-fivem/shared";

/** Shows a notification card on one player's screen (ai-core draws it); `text` is already translated. */
export function notify(
  source: number,
  text: string,
  kind: NotificationKind = "info",
  duration?: number,
): void {
  const notification: Notification = { text, kind, duration };
  emitNet(CORE.clientNotifyEvent, source, notification);
}
