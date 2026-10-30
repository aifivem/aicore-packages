import type { ActionResult } from "@aicore-fivem/shared";

/** A refused action: `{ ok: false, error }` with a lang key the client shows. */
export const fail = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

/** The reply is an ok `ActionResult` (any extra fields unchecked: parse the ones you read). */
export const isActionOk = (
  reply: unknown,
): reply is { ok: true } & Record<string, unknown> =>
  typeof reply === "object" &&
  reply !== null &&
  !Array.isArray(reply) &&
  (reply as { ok?: unknown }).ok === true;

/** The lang key of a refused reply: its `error`, or `fallback` when the reply is missing or malformed; null when ok. */
export function replyError(reply: unknown, fallback: string): string | null {
  if (isActionOk(reply)) return null;
  const error =
    typeof reply === "object" && reply !== null
      ? (reply as { error?: unknown }).error
      : undefined;
  return typeof error === "string" && error !== "" ? error : fallback;
}

export type { ActionResult };
