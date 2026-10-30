import { createLogger } from "../shared"

const log = createLogger(GetCurrentResourceName())

/**
 * Whether the net event being handled came from the server (read it before the first `await`). On a client only
 * events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
 */
export const fromServer = (): boolean => Boolean(globalThis.source)

/**
 * A net event the server sends: the only way an ai-* client listens to the server (never bare `onNet`). Calls that
 * did not come from the server (another script's local emit) are dropped. A handler that takes arguments gets them
 * only through `args` (`(name, { args }, handler)`; `null` drops the call). A thrown error is logged.
 */
export function onServerEvent(name: string, handler: () => unknown): void
export function onServerEvent<const A extends readonly unknown[]>(
  name: string,
  options: { args: (raw: unknown[]) => A | null },
  handler: (...args: A) => unknown
): void
export function onServerEvent(
  name: string,
  first:
    (() => unknown) | { args: (raw: unknown[]) => readonly unknown[] | null },
  second?: (...args: readonly unknown[]) => unknown
): void {
  const [handler, parse] =
    typeof first === "function" ? [first, null] : [second, first.args]
  onNet(name, (...raw: unknown[]) => {
    if (!fromServer() || !handler) return
    const args = parse ? parse(raw) : []
    if (!args)
      return log.warn(`event ${name} from the server had invalid arguments`)
    Promise.resolve()
      .then(() => handler(...args))
      .catch((error: unknown) => log.error(`event ${name} failed`, error))
  })
}
