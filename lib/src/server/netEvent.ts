import { createLogger } from "../shared";
import {
  ClientGate,
  type ClientInputOptions,
  type ParsedInputOptions,
} from "./gate";

const log = createLogger(GetCurrentResourceName());

/**
 * A net event a client sends: the only way an ai-* server listens to clients (never bare `onNet`). The source is
 * read first, then the gate runs (real player, rate, guards, `args` parser, optional lock) and only then the
 * handler. A handler that takes arguments gets them only through `args` (options come before it then), so
 * unchecked client data never reaches it. A thrown error is logged, never sent back.
 *
 *   onClientEvent("ai-shop:close", (source) => shop.close(source));
 *   onClientEvent(
 *     "ai-shop:buy",
 *     { args: ([item, count]) => (typeof item === "string" && isCount(count) ? [item, count] : null), guards: [hasCharacter()], lock: true },
 *     (source, item, count) => shop.buy(source, item, count),
 *   );
 */
export function onClientEvent(
  name: string,
  handler: (source: number) => unknown,
  options?: ClientInputOptions,
): void;
export function onClientEvent<const A extends readonly unknown[]>(
  name: string,
  options: ParsedInputOptions<A>,
  handler: (source: number, ...args: A) => unknown,
): void;
export function onClientEvent(
  name: string,
  first: ((source: number) => unknown) | ParsedInputOptions<readonly unknown[]>,
  second?:
    | ClientInputOptions
    | ((source: number, ...args: readonly unknown[]) => unknown),
): void {
  const [handler, options] =
    typeof first === "function"
      ? [first, (second ?? {}) as ClientInputOptions]
      : [
          second as (source: number, ...args: readonly unknown[]) => unknown,
          first,
        ];
  const gate = new ClientGate(name, options, 10);
  onNet(name, (...raw: unknown[]) => {
    const source = Number(globalThis.source);
    const args = gate.check(source, raw);
    if (!args) return;
    gate
      .run(source, undefined, () => handler(source, ...args))
      .catch((error: unknown) =>
        log.error(`event ${name} failed for ${source}`, error),
      );
  });
}
