import {
  DEFAULT_CALLBACK_TIMEOUT,
  requestEvent,
  responseEvent,
} from "../fivem/callbackNames"
import { createLogger } from "../shared"
import {
  ClientGate,
  type ClientInputOptions,
  type ParsedInputOptions,
} from "./gate"

const log = createLogger(GetCurrentResourceName())
const resource = GetCurrentResourceName()
const REFUSED = Symbol("refused")

/**
 * Answers a client's `triggerServerCallback(name, ...)`. The call passes the same gate as `onClientEvent` (real
 * player, rate 20/s by default, guards, `args` parser, optional lock); a refused call is answered with a failure,
 * so the client's promise rejects at once. Forms as `onClientEvent`: `(name, handler, options?)` without arguments,
 * `(name, { args, ... }, handler)` with them. The handler's return value (or resolved promise) is sent back.
 */
export function onClientCallback(
  name: string,
  handler: (source: number) => unknown,
  options?: ClientInputOptions
): void
export function onClientCallback<const A extends readonly unknown[]>(
  name: string,
  options: ParsedInputOptions<A>,
  handler: (source: number, ...args: A) => unknown
): void
export function onClientCallback(
  name: string,
  first: ((source: number) => unknown) | ParsedInputOptions<readonly unknown[]>,
  second?:
    | ClientInputOptions
    | ((source: number, ...args: readonly unknown[]) => unknown)
): void {
  const [handler, options] =
    typeof first === "function"
      ? [first, (second ?? {}) as ClientInputOptions]
      : [
          second as (source: number, ...args: readonly unknown[]) => unknown,
          first,
        ]
  const gate = new ClientGate(name, options, 20)

  onNet(
    requestEvent(name),
    async (caller: unknown, id: unknown, ...raw: unknown[]) => {
      const source = Number(globalThis.source)
      if (
        typeof caller !== "string" ||
        caller.length > 64 ||
        typeof id !== "number"
      )
        return
      const args = gate.check(source, raw)
      if (!args) return emitNet(responseEvent(caller), source, id, false, null)
      try {
        const result = await gate.run(source, REFUSED, () =>
          handler(source, ...args)
        )
        if (result === REFUSED)
          emitNet(responseEvent(caller), source, id, false, null)
        else emitNet(responseEvent(caller), source, id, true, result ?? null)
      } catch (error) {
        log.error(`callback ${name} failed for ${source}`, error)
        emitNet(responseEvent(caller), source, id, false, null)
      }
    }
  )
}

interface Pending {
  source: number
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const pending = new Map<number, Pending>()
let nextId = 0

onNet(responseEvent(resource), (id: unknown, ok: unknown, result: unknown) => {
  const entry = typeof id === "number" ? pending.get(id) : undefined
  // Only the player we asked may answer.
  if (!entry || entry.source !== Number(globalThis.source)) return
  pending.delete(id as number)
  clearTimeout(entry.timer)
  if (ok === true) entry.resolve(result)
  else entry.reject(new Error("client callback failed"))
})

/** Asks one player's client (`onServerCallback(name, ...)` there) and resolves with its answer (unknown: parse it). */
export function triggerClientCallback(
  name: string,
  source: number,
  args: unknown[] = [],
  timeoutMs = DEFAULT_CALLBACK_TIMEOUT
): Promise<unknown> {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`client callback ${name} timed out for ${source}`))
    }, timeoutMs)
    pending.set(id, { source, resolve, reject, timer })
    emitNet(requestEvent(name), source, resource, id, ...args)
  })
}
