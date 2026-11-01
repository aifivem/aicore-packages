// Group B scripts at scale (`bun bench/scripts-b.bench.ts` in packages/lib): natives stubbed (each stub counts its
// calls), the hot loops of ai-properties, ai-drugs and ai-scoreboard copied as they are written in those resources.
// Times are JS only; native calls are counted so their real cost (1-5 µs each in the game) can be added.
// Last run (2026-10-30): properties update per ownership change 1k/10k/100k = ~4-14 µs + 10 natives (was a full
// rebuild: 4 ms/37 ms/614 ms + 10k/100k/1M natives); accessList 100k/1M owned = ~1 µs (was 4.2/28 ms); drugs watchersOf() 2,048/10k = 1 µs per change (was 0.2/1.4 ms);
// rotten() 100k/1M = 0.05/0.1 ms a minute after a first 0.8/6 ms sweep (was 6/52 ms every minute); drugs client
// snapshot 1k/5k plants = one render, 1k/5k visits, 0.2 ms (was 0.5M/12.5M visits, 10/238 ms); scoreboard 2,048/10k online = ~114/572 KB once per session (latent), ~93 B per open, 50 B per join and subscriber (was 93/466 KB per open).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const g = globalThis as Record<string, unknown>;
let natives = 0;
// Every PascalCase call in the lib's client code gets a counting stub that returns 0.
for (const dir of ["../src/client", "../src/fivem", "../src/shared"]) {
  const path = join(import.meta.dirname, dir);
  for (const file of readdirSync(path, { recursive: true }) as string[]) {
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

// --- ai-properties client: a `prop:<id>` change re-adds only that property's door point (label function, blip).
const { Points } = await import("../src/client/points/points");
for (const count of [1_000, 10_000, 100_000]) {
  const points = new Points();
  const doors = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    coords: { x: rand(-4000, 4000), y: rand(-4000, 8000), z: 30 },
  }));
  const add = (d: (typeof doors)[number]) =>
    points.add(d.id, {
      coords: d.coords,
      label: () => "Buy",
      icon: "house",
      radius: 1.5,
      blip: { sprite: 350, color: 0, scale: 0.7, label: "House" },
      onPressed: () => undefined,
    });
  for (const d of doors) add(d);
  const runs = 100;
  natives = 0;
  const ms = time(() => {
    for (let r = 0; r < runs; r++) add(doors[r % count] as (typeof doors)[0]);
  });
  console.log(
    `properties client update, ${count.toLocaleString("en")} properties: ${fmt(ms / runs)} JS, ${(natives / runs).toFixed(0)} native calls per ownership change`,
  );
}

// --- ai-properties server: `mine` reads the per-character index (Owners.byChar), never every owned property.
for (const count of [100_000, 1_000_000]) {
  const byChar = new Map<number, Map<string, string>>();
  const index = (charId: number, id: string, access: string) => {
    let list = byChar.get(charId);
    if (!list) byChar.set(charId, (list = new Map()));
    list.set(id, access);
  };
  for (let i = 0; i < count; i++) {
    index(i, `p${i}`, "owner");
    if (i % 10 === 0) index(i + 1, `p${i}`, "key");
  }
  const accessList = (charId: number) => {
    const list = byChar.get(charId);
    return list ? [...list].map(([id, access]) => ({ id, access })) : [];
  };
  const runs = 10_000;
  const ms = time(() => {
    for (let i = 0; i < runs; i++) accessList(i * 7);
  });
  console.log(
    `properties accessList, ${count.toLocaleString("en")} owned: ${fmt(ms / runs)} per call`,
  );
}

// --- ai-drugs server: a plant put/remove reads the watcher set of its cell (Plants.watchersOf, kept in watch /
// unwatch); the rot sweep reads only the planted minutes that just passed the limit (Plants.rotten, byMinute).
const cellKey = (cx: number, cy: number) => `${cx}:${cy}`;
for (const online of [2_048, 10_000]) {
  const watchers = new Map<string, Set<number>>();
  for (let s = 1; s <= online; s++) {
    const cx = Math.floor(rand(-30, 60));
    const cy = Math.floor(rand(-30, 60));
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const key = cellKey(cx + dx, cy + dy);
        const set = watchers.get(key);
        if (set) set.add(s);
        else watchers.set(key, new Set([s]));
      }
  }
  const runs = 1_000;
  let sent = 0;
  const ms = time(() => {
    for (let i = 0; i < runs; i++)
      for (const _source of watchers.get(cellKey(i % 90, i % 70)) ?? []) sent++;
  });
  console.log(
    `drugs watchersOf(), ${online.toLocaleString("en")} watchers: ${fmt(ms / runs)} per plant change (a rot sweep of 1,000 plants: ${fmt(ms)}, ${sent.toLocaleString("en")} emits)`,
  );
}
for (const count of [100_000, 1_000_000]) {
  const MINUTE = 60_000;
  const byMinute = new Map<number, Set<number>>();
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const minute = Math.floor((now - rand(0, 4 * 3_600_000)) / MINUTE);
    const set = byMinute.get(minute);
    if (set) set.add(i);
    else byMinute.set(minute, new Set([i]));
  }
  const limit = 3 * 3_600_000;
  // First sweep after the load walks the minute keys once; each later sweep reads the one minute that passed.
  let swept = -Infinity;
  const sweep = (at: number) => {
    const cutoff = Math.floor((at - limit) / MINUTE) - 1;
    const out: number[] = [];
    if (swept === -Infinity) {
      for (const [minute, ids] of byMinute)
        if (minute <= cutoff) out.push(...ids);
    } else
      for (let minute = swept + 1; minute <= cutoff; minute++)
        out.push(...(byMinute.get(minute) ?? []));
    swept = Math.max(swept, cutoff);
    return out;
  };
  const first = time(() => sweep(now));
  let found = 0;
  const later = time(() => {
    found = sweep(now + MINUTE).length;
  });
  console.log(
    `drugs rotten() sweep, ${count.toLocaleString("en")} plants: first ${fmt(first)}, then ${fmt(later)} a minute (${found.toLocaleString("en")} plants rotted in that minute)`,
  );
}

// --- ai-drugs client: a snapshot adds every plant, then renders once (one walk of the list).
for (const count of [200, 1_000, 5_000]) {
  const plants = Array.from({ length: count }, () => ({
    x: rand(-200, 200),
    y: rand(-200, 200),
    z: 30,
    plantedAt: Date.now() - rand(0, 3_600_000),
  }));
  let walked = 0;
  const ms = time(() => {
    for (const p of plants) {
      walked++;
      if (Math.hypot(p.x, p.y, p.z - 30) <= 100) walked += 0;
    }
  });
  console.log(
    `drugs client snapshot, ${count.toLocaleString("en")} plants in 3x3 cells: ${walked.toLocaleString("en")} plant visits, ${fmt(ms)} JS (one render())`,
  );
}

// --- ai-scoreboard: the list is a snapshot once per session (latent), then one small delta per join / leave to each
// subscriber; an open sends only the counts.
for (const online of [2_048, 10_000]) {
  const rows = Array.from({ length: online }, (_, i) => ({
    key: i + 1,
    id: i + 1,
    name: `Firstname${i + 1} Lastname${i + 1}`,
  }));
  const snapshot = JSON.stringify([1, rows]);
  const counts = JSON.stringify({
    online,
    max: online,
    jobs: [
      { label: "Police", count: 40 },
      { label: "EMS", count: 20 },
    ],
  });
  const delta = JSON.stringify([2, rows[0]]);
  const runs = 1000;
  const ms = time(() => {
    for (let r = 0; r < runs; r++) JSON.stringify([r, rows[r % online]]);
  });
  console.log(
    `scoreboard, ${online.toLocaleString("en")} online: snapshot ~${(snapshot.length / 1024).toFixed(0)} KB once per session (latent), ${counts.length} B per open, ${delta.length} B per join to each subscriber (${fmt(ms / runs)} to build)`,
  );
}
export {};
