import { DEFAULT_CALLBACK_TIMEOUT, requestEvent, responseEvent } from "../fivem/callbackNames";
import { createLogger } from "../shared";
import { fromServer } from "./netEvent";

const resource = GetCurrentResourceName();
const log = createLogger(resource);

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<number, Pending>();
let nextId = 0;

onNet(responseEvent(resource), (id: unknown, ok: unknown, result: unknown) => {
  if (!fromServer()) return;
  const entry = typeof id === "number" ? pending.get(id) : undefined;
  if (!entry) return;
  pending.delete(id as number);
  clearTimeout(entry.timer);
  if (ok === true) entry.resolve(result);
  else entry.reject(new Error("server callback failed"));
});

/**
 * Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
 * parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
 */
export function triggerServerCallback(
  name: string,
  args: unknown[] = [],
  timeoutMs = DEFAULT_CALLBACK_TIMEOUT,
): Promise<unknown> {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`server callback ${name} timed out`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    emitNet(requestEvent(name), resource, id, ...args);
  });
}

/** Answers the server's `triggerClientCallback(name, source, ...)`. Arguments are unknown: parse before use. */
export function onServerCallback(name: string, handler: (...args: unknown[]) => unknown): void {
  onNet(requestEvent(name), async (caller: unknown, id: unknown, ...args: unknown[]) => {
    if (!fromServer() || typeof caller !== "string" || typeof id !== "number") return;
    try {
      const result = await handler(...args);
      emitNet(responseEvent(caller), id, true, result ?? null);
    } catch (error) {
      log.error(`callback ${name} failed`, error);
      emitNet(responseEvent(caller), id, false, null);
    }
  });
}
