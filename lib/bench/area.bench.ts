// AreaStream at scale (`bun bench/area.bench.ts` in packages/lib), natives stubbed: 100k and 1M items spread over
// the map (about 8 km x 8 km, 64 m cells), 2048 followers. Measures adding items, a set / delete with followers
// around (who to tell), a follower's snapshot and cell change, `followAll` with every follower moving, memory.
// Last run: see the `aicore-fivem` skill's references/scale.md.
const g = globalThis as Record<string, unknown>;
let sent = 0;
const positions = new Map<number, { x: number; y: number; z: number }>();
g.GetCurrentResourceName = () => "bench";
g.GetGameTimer = () => 0;
g.on = () => undefined;
g.exports = { "ai-core": {} };
g.emitNet = () => {
  sent++;
};
g.GetPlayerPed = (s: string) => Number(s);
g.GetEntityCoords = (ped: number) => {
  const p = positions.get(ped) ?? { x: 0, y: 0, z: 0 };
  return [p.x, p.y, p.z];
};

const { AreaStream } = await import("../src/server/areaStream");

interface Item {
  id: number;
  x: number;
  y: number;
}
const SPAN = 8000;
const rand = () => Math.random() * SPAN - SPAN / 2;
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
const mb = () => process.memoryUsage().heapUsed / 1048576;

for (const n of [100_000, 1_000_000]) {
  Bun.gc(true);
  const heap = mb();
  const stream = new AreaStream<Item, Item>({
    event: "bench",
    view: (i) => i,
    range: 1,
  });
  const items: Item[] = [];
  for (let i = 0; i < n; i++) items.push({ id: i, x: rand(), y: rand() });
  const load = time(() => stream.load(items));
  Bun.gc(true);
  const perItem = ((mb() - heap) * 1048576) / n;
  // 2048 followers spread the same way.
  for (let s = 1; s <= 2048; s++) positions.set(s, { x: rand(), y: rand(), z: 0 });
  sent = 0;
  const starts = time(() => {
    for (let s = 1; s <= 2048; s++) stream.start(s);
  });
  const snapshotEvents = sent;
  const adds = 10_000;
  const add = time(() => {
    for (let i = 0; i < adds; i++)
      stream.set({ id: n + i, x: rand(), y: rand() });
  });
  const del = time(() => {
    for (let i = 0; i < adds; i++) stream.delete(n + i);
  });
  // Every follower walks one cell east.
  for (const [s, p] of positions) positions.set(s, { ...p, x: p.x + 64 });
  sent = 0;
  const follow = time(() => stream.followAll());
  const followEvents = sent;
  const idle = time(() => stream.followAll());
  console.log(
    `${n.toLocaleString("en")} items: load ${fmt(load)}, ~${perItem.toFixed(0)} B/item | 2048 starts ${fmt(starts)} (${snapshotEvents} events) | set ${fmt(add / adds)}, delete ${fmt(del / adds)} | followAll all moving ${fmt(follow)} (${followEvents} events), none moving ${fmt(idle)}`,
  );
}
