import { loadLocaleTexts } from "../fivem/locale";
import { isActionOk, replyError } from "../shared/action";
import { triggerServerCallback } from "./callback";
import { notify } from "./notify";

/** This resource's lang table, read on the first refusal. */
let texts: Record<string, string> | null = null;

export interface CallActionOptions {
  /** Lang key shown when the reply is missing, malformed, timed out or the call was refused by the gate. */
  fallback: string;
  /** ms before the call counts as failed (default the callback timeout). */
  timeout?: number;
  /** No notification on a refusal (the caller shows the error itself). */
  silent?: boolean;
}

/**
 * Runs an action on the server (`onClientCallback` answering an `ActionResult`). A refusal, a timeout or a gate
 * refusal shows the error's text from this resource's lang file as an error notification. Resolves with the ok
 * reply (extra fields unchecked: parse the ones you read), null otherwise.
 */
export async function callAction(
  name: string,
  args: unknown[] = [],
  options: CallActionOptions,
): Promise<({ ok: true } & Record<string, unknown>) | null> {
  const reply = await triggerServerCallback(name, args, options.timeout).catch(
    () => null,
  );
  if (isActionOk(reply)) return reply;
  if (!options.silent) {
    const key = replyError(reply, options.fallback) ?? options.fallback;
    texts ??= loadLocaleTexts();
    notify(texts[key] ?? key, "error");
  }
  return null;
}
