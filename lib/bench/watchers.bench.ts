// KeyWatchers at scale (`bun bench/watchers.bench.ts` in packages/lib), natives stubbed: 100k / 1M watchers spread
// over as many keys (one each) and over 1,000 keys, then moves, lookups, stops and drops. Every operation is O(1).
const g = globalThis as Record<string, unknown>;
const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
g.GetCurrentResourceName = () => "bench";
g.exports = { "ai-core": {} };
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  handlers.set(name, [...(handlers.get(name) ?? []), fn]);
const drop = (source: number) => {
  g.source = source;
  for (const fn of handlers.get("playerDropped") ?? []) fn();
};

const { KeyWatchers } = await import("../src/server/watchers");

const time = (fn: () => unknown): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};
const per = (ms: number, n: number): string =>
  `${((ms * 1e6) / n).toFixed(0)} ns/op`;
const heap = (): number => {
  Bun.gc(true);
  return process.memoryUsage().heapUsed;
};

// Each size runs in its own process so the heap figure holds only its watchers.
const [argN, argKeys] = process.argv.slice(2).map(Number);
if (argN === undefined || argKeys === undefined) {
  for (const n of [100_000, 1_000_000])
    for (const keys of [n, 1000]) {
      const child = Bun.spawnSync(
        ["bun", import.meta.path, String(n), String(keys)],
        { stdout: "inherit", stderr: "inherit" },
      );
      if (child.exitCode !== 0) process.exit(1);
    }
  process.exit(0);
}
for (const n of [argN]) {
  for (const keys of [argKeys]) {
    const before = heap();
    const w = new KeyWatchers<number>();
    const watch = time(() => {
      for (let s = 1; s <= n; s++) w.watch(s, s % keys);
    });
    const bytes = (heap() - before) / n;
    const move = time(() => {
      for (let s = 1; s <= n; s++) w.watch(s, (s + 1) % keys);
    });
    let seen = 0;
    const of = time(() => {
      for (let k = 0; k < n; k++) seen += w.of(k % keys)?.size ?? 0;
    });
    const keyOf = time(() => {
      for (let s = 1; s <= n; s++) seen += w.keyOf(s) ?? 0;
    });
    const stop = time(() => {
      for (let s = 1; s <= n / 2; s++) w.stop(s);
    });
    const dropped = time(() => {
      for (let s = n / 2 + 1; s <= n; s++) drop(s);
    });
    const left = w.of(1)?.size ?? 0;
    console.log(
      `${n.toLocaleString("en-US")} watchers / ${keys.toLocaleString("en-US")} keys: watch ${per(watch, n)}, move ${per(move, n)}, of ${per(of, n)}, keyOf ${per(keyOf, n)}, stop ${per(stop, n / 2)}, drop ${per(dropped, n / 2)}, ~${bytes.toFixed(0)} B/watcher, left ${left} (${seen > 0 ? "ok" : "?"})`,
    );
  }
}
