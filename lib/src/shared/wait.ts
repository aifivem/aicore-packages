/** Resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves with the first value `check` returns that is not undefined, checking once per tick.
 * Rejects after `timeoutMs` (default 10 s); pass `false` to wait forever.
 * Return `cond || undefined` from `check` to wait for a truthy condition.
 */
export function waitFor<T>(
  check: () => T | undefined,
  timeoutMs: number | false = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = (): void => {
      const value = check();
      if (value !== undefined) return resolve(value);
      if (timeoutMs !== false && Date.now() - started > timeoutMs)
        return reject(new Error(`waitFor timed out after ${timeoutMs} ms`));
      setTimeout(poll, 0);
    };
    poll();
  });
}
