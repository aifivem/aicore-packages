// Group B scripts at scale (`bun bench/scripts-b.bench.ts` in packages/lib): natives stubbed (each stub counts its
// calls), the hot loops of ai-properties, ai-drugs and ai-scoreboard copied as they are written in those resources.
// Times are JS only; native calls are counted so their real cost (1-5 µs each in the game) can be added.
// Last run (2026-10-30): properties rebuild 1k/10k/100k = 4 ms/37 ms/614 ms + 10k/100k/1M natives; accessList
// 100k/1M owned = 4.2/28 ms; drugs watchers() 2,048/10k = 0.2/1.4 ms per change; rotten() 100k/1M = 6/52 ms;
// drugs client snapshot 1k/5k plants = 0.5M/12.5M visits, 10/238 ms; scoreboard 2,048/10k online = 93/466 KB per open.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const g = globalThis as Record<string, unknown>;
let natives = 0;
// Every PascalCase call in the lib's client code gets a counting stub that returns 0.
for (const dir of ["../src/client", "../src/fivem", "../src/shared"]) {
  const path = join(import.meta.dir, dir);
  for (const file of readdirSync(path)) {
    if (!file.endsWith(".ts")) continue;
    const text = readFileSync(join(path, file), "utf8");
    for (const [, name] of text.matchAll(/\b([A-Z][A-Za-z0-9]+)\(/g))
      if (name && !(name in g))
        g[name] = () => {
          natives++;
          return 0;
        };
  }
}
g.GetCurrentResourceName = () => "bench";
g.GlobalState = {};
g.LocalPlayer = { state: {} };
g.AddStateBagChangeHandler = () => 0;
g.RegisterNuiCallbackType = () => undefined;
g.RegisterNuiCallback = () => undefined;
g.GetEntityCoords = () => {
  natives++;
  return [0, 0, 30];
};
g.GetResourceState = () => "missing";
g.GetConvar = (_: string, d: string) => d;
g.on = () => undefined;
g.onNet = () => undefined;
g.emitNet = () => undefined;
g.exports = new Proxy({}, { get: () => new Proxy({}, { get: () => () => 0 }) });
g.setInterval = () => 1;
g.clearInterval = () => undefined;
g.setTick = () => 1;
g.clearTick = () => undefined;

const fmt = (ms: number): string =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(2)} s`
    : ms >= 1
      ? `${ms.toFixed(1)} ms`
      : `${(ms * 1000).toFixed(1)} µs`;
const time = (fn: () => void): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};
const rand = (min: number, max: number) => min + Math.random() * (max - min);

// --- ai-properties client: every `prop:<id>` change anywhere rebuilds every door point (clear + add with blip).
const { Points } = await import("../src/client/point");
for (const count of [1_000, 10_000, 100_000]) {
  const points = new Points();
  const doors = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    coords: { x: rand(-4000, 4000), y: rand(-4000, 8000), z: 30 },
  }));
  const build = () => {
    points.clear();
    for (const d of doors)
      points.add(d.id, {
        coords: d.coords,
        label: "Buy",
        icon: "house",
        radius: 1.5,
        blip: { sprite: 350, color: 0, scale: 0.7, label: "House" },
        onPressed: () => undefined,
      });
  };
  build();
  natives = 0;
  const ms = time(build);
  console.log(
    `properties client rebuild, ${count.toLocaleString("en")} properties: ${fmt(ms)} JS, ${natives.toLocaleString("en")} native calls per rebuild`,
  );
}

// --- ai-properties server: `mine` walks every owned property for one character (Owners.accessList).
for (const count of [100_000, 1_000_000]) {
  const byProperty = new Map<
    string,
    { owner: number; keys: Map<number, string> }
  >();
  for (let i = 0; i < count; i++)
    byProperty.set(`p${i}`, {
      owner: i,
      keys: i % 10 === 0 ? new Map([[i + 1, "x"]]) : new Map(),
    });
  const accessList = (charId: number) => {
    const list: Array<{ id: string; access: string }> = [];
    for (const [id, o] of byProperty) {
      if (o.owner === charId) list.push({ id, access: "owner" });
      else if (o.keys.has(charId)) list.push({ id, access: "key" });
    }
    return list;
  };
  const runs = 50;
  const ms = time(() => {
    for (let i = 0; i < runs; i++) accessList(i * 7);
  });
  console.log(
    `properties accessList, ${count.toLocaleString("en")} owned: ${fmt(ms / runs)} per call (20 calls/s per player allowed: ${fmt((ms / runs) * 20)}/s from one player)`,
  );
}

// --- ai-drugs server: every plant put/remove walks every watcher (Plants.watchers); the rot sweep walks every plant.
const cellKey = (cx: number, cy: number) => `${cx}:${cy}`;
for (const online of [2_048, 10_000]) {
  const watching = new Map<
    number,
    { cx: number; cy: number; keys: Set<string> }
  >();
  for (let s = 1; s <= online; s++) {
    const cx = Math.floor(rand(-30, 60));
    const cy = Math.floor(rand(-30, 60));
    const keys = new Set<string>();
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) keys.add(cellKey(cx + dx, cy + dy));
    watching.set(s, { cx, cy, keys });
  }
  const watchers = (key: string) =>
    [...watching].filter(([, w]) => w.keys.has(key)).map(([source]) => source);
  const runs = 1_000;
  const ms = time(() => {
    for (let i = 0; i < runs; i++) watchers(cellKey(i % 90, i % 70));
  });
  console.log(
    `drugs watchers(), ${online.toLocaleString("en")} watchers: ${fmt(ms / runs)} per plant change (a rot sweep of 1,000 plants: ${fmt(ms)})`,
  );
}
for (const count of [100_000, 1_000_000]) {
  const byId = new Map<number, { id: number; plantedAt: number }>();
  const now = Date.now();
  for (let i = 0; i < count; i++)
    byId.set(i, { id: i, plantedAt: now - rand(0, 4 * 3_600_000) });
  const limit = 3 * 3_600_000;
  const ms = time(() => {
    [...byId.values()].filter((p) => now - p.plantedAt > limit).map((p) => p.id);
  });
  console.log(
    `drugs rotten() sweep, ${count.toLocaleString("en")} plants: ${fmt(ms)} once a minute`,
  );
}

// --- ai-drugs client: a snapshot calls put() per plant and put() runs render(), which walks every plant: O(n²).
for (const count of [200, 1_000, 5_000]) {
  const plants = Array.from({ length: count }, () => ({
    x: rand(-200, 200),
    y: rand(-200, 200),
    z: 30,
    plantedAt: Date.now() - rand(0, 3_600_000),
  }));
  let walked = 0;
  const ms = time(() => {
    for (let n = 1; n <= count; n++)
      for (let i = 0; i < n; i++) {
        const p = plants[i];
        if (!p) continue;
        walked++;
        if (Math.hypot(p.x, p.y, p.z - 30) <= 100) walked += 0;
      }
  });
  console.log(
    `drugs client snapshot, ${count.toLocaleString("en")} plants in 3x3 cells: ${walked.toLocaleString("en")} plant visits, ${fmt(ms)} JS (+ ${count.toLocaleString("en")} render() calls, each a GetEntityCoords and points.refresh())`,
  );
}

// --- ai-scoreboard: every open builds and sends every online player's id and name (one reliable callback reply).
for (const online of [2_048, 10_000]) {
  const ids = Array.from({ length: online }, (_, i) => i + 1);
  let payload = "";
  const runs = 100;
  const ms = time(() => {
    for (let r = 0; r < runs; r++)
      payload = JSON.stringify(
        ids.map((id) => ({ id, name: `Firstname${id} Lastname${id}` })),
      );
  });
  const kb = payload.length / 1024;
  console.log(
    `scoreboard board, ${online.toLocaleString("en")} online: ${fmt(ms / runs)} build, ~${kb.toFixed(0)} KB per open (JSON; msgpack ~10% less); 1 open/s allowed per player -> ${((kb * online) / 1024).toFixed(0)} MB/s if everyone holds the key`,
  );
}
export {};
