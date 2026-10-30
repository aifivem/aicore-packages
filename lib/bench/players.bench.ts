// Per-player stores, panel views and the gate's log preview at scale (`bun bench/players.bench.ts` in packages/lib),
// natives stubbed. PendingActions / PlayerMap / Cooldowns hold one entry per online player (2048 at most), so 100k and
// 1M entries are far past what a server holds. Panel views: a records file of 100k / 1M records read once, then one
// record edit (must stay O(1)). onCharacter: the restart replay over 10,000 loaded players.
// Last run: see the `aicore-fivem` skill's references/scale.md.
const g = globalThis as Record<string, unknown>;
const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
let clock = 0;
let loaded: number[] = [];
g.GetCurrentResourceName = () => "bench";
g.GetGameTimer = () => clock;
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  handlers.set(name, [...(handlers.get(name) ?? []), fn]);
const emit = (name: string, ...args: unknown[]) => {
  for (const fn of handlers.get(name) ?? []) fn(...args);
};
g.exports = {
  "ai-core": {
    GetLoadedSources: () => loaded,
    GetCharacter: (source: number) => ({
      id: source,
      citizenid: String(source),
    }),
    GetJobs: () => [],
    GetGangs: () => [],
    GetDutyJob: () => null,
  },
};

const { PendingActions } = await import("../src/server/pending");
const { Cooldowns, onCharacter, PlayerMap } =
  await import("../src/server/players");
const { FileViews } = await import("../src/shared/records");
const { previewJson } = await import("../src/shared");

const time = (fn: () => unknown): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};
const fmt = (ms: number): string =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(2)} s`
    : ms >= 1
      ? `${ms.toFixed(1)} ms`
      : `${(ms * 1000).toFixed(2)} µs`;
const drop = (source: number) => {
  g.source = source;
  emit("playerDropped");
};

for (const n of [100_000, 1_000_000]) {
  const pending = new PendingActions<{ slot: number }>();
  const tokens: number[] = [];
  const start = time(() => {
    for (let s = 1; s <= n; s++)
      tokens.push(pending.start(s, { slot: s }, 5000));
  });
  clock += 5000;
  let ok = 0;
  const take = time(() => {
    for (let s = 1; s <= n; s++) if (pending.take(s, tokens[s - 1]!)) ok++;
  });
  const map = new PlayerMap<number>();
  const cooldowns = new Cooldowns();
  const fill = time(() => {
    for (let s = 1; s <= n; s++) {
      map.set(s, s);
      cooldowns.start(s, 1000);
    }
  });
  const ready = time(() => {
    for (let s = 1; s <= n; s++) if (cooldowns.ready(s)) ok++;
  });
  // One drop walks every store of the resource once (here 3 stores + the gate-free lib), never the players.
  const oneDrop = time(() => drop(n));
  console.log(
    `${n.toLocaleString("en")} entries: PendingActions start ${fmt(start / n)} / take ${fmt(take / n)} each (${ok >= n ? "all taken" : "missing"}), PlayerMap+Cooldowns fill ${fmt(fill)}, Cooldowns.ready ${fmt(ready / n)} each, one playerDropped ${fmt(oneDrop)}`,
  );
}

for (const n of [100_000, 1_000_000]) {
  const raw: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < n; i++)
    raw[`shop_${i}`] = {
      label: `Shop ${i}`,
      price: i,
      coords: { x: i, y: i, z: 30 },
    };
  const views = new FileViews(() => raw);
  let records: ReadonlyMap<string, { label: string; price: number }> =
    new Map();
  const load = time(() => {
    records = views.records("shops", (_key, v) =>
      typeof v.label === "string" && typeof v.price === "number"
        ? { label: v.label, price: v.price }
        : null,
    );
  });
  const edit = time(() => {
    for (let i = 0; i < 1000; i++) {
      const key = `shop_${i * 7}`;
      raw[key] = { label: "Edited", price: 1, coords: { x: 0, y: 0, z: 0 } };
      views.changed("shops", key, raw[key]);
    }
  });
  console.log(
    `${n.toLocaleString("en")} records: records view load ${fmt(load)}, one record edit ${fmt(edit / 1000)} (${records.size} parsed, ${records.get("shop_7")?.label})`,
  );
}

// One size only: the lib's `online` mirror starts once per process. 10,000 is past FiveM's 2,048 cap.
for (const count of [10_000]) {
  loaded = Array.from({ length: count }, (_, i) => i + 1);
  let seen = 0;
  onCharacter({ loaded: () => void seen++ });
  const replay = await new Promise<number>((resolve) => {
    const t = performance.now();
    setImmediate(() => setImmediate(() => resolve(performance.now() - t)));
  });
  console.log(
    `${count.toLocaleString("en")} loaded: onCharacter replay ${fmt(replay)} incl. the online mirror start (${seen} delivered)`,
  );
}

const huge = {
  records: Array.from({ length: 200_000 }, (_, i) => ({
    i,
    name: "x".repeat(40),
  })),
};
const full = time(() => JSON.stringify(huge).slice(0, 200));
const capped = time(() => previewJson(huge, 200));
console.log(
  `gate log line of a ~10 MB payload: JSON.stringify ${fmt(full)}, previewJson ${fmt(capped)}`,
);
export {};
