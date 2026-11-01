// Online mirror and proximity at scale (`bun bench/online.bench.ts` in packages/lib): natives stubbed, N players spread
// over the map (8 km square). ai-core's `GetPlayersInScope` export is stubbed with precomputed scope lists (players
// within 424 m, what ai-core's scope handlers keep); like the real export it hands out a copy per call.
// Times the mirror's start, one playersNear / nearestPlayerTo, one playersNearCoords (walks every loaded player) and one
// onDutyFor walk.
// Online counts stop at 10k: FiveM caps a server at 2048 players (OneSync), so 100k online cannot happen.
// Last run: see the `aicore-fivem` skill's references/scale.md.
const g = globalThis as Record<string, unknown>;
let players: { x: number; y: number }[] = [];
let scopes: number[][] = [];
const handlers = new Map<string, (...args: unknown[]) => void>();
g.GetCurrentResourceName = () => "bench";
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  handlers.set(name, fn);
g.GetPlayerPed = (source: string) => Number(source);
g.GetPlayerRoutingBucket = (source: string) => Number(source) % 4;
g.GetEntityCoords = (ped: number) => {
  const p = players[ped - 1];
  return p ? [p.x, p.y, 30] : [0, 0, 0];
};
const jobs = ["police", "ambulance", "mechanic", "taxi", "unemployed"];
const core = {
  GetLoadedSources: () => players.map((_, i) => i + 1),
  GetCharacter: (source: number) => ({
    id: source,
    citizenid: String(source),
    slot: 1,
    firstname: "A",
    lastname: "B",
    birthdate: "1990-01-01",
    sex: "male",
  }),
  GetJobs: (source: number) => [{ job: jobs[source % jobs.length], grade: 0 }],
  GetGangs: () => [],
  GetDutyJob: (source: number) =>
    source % 3 === 0 ? jobs[source % jobs.length] : null,
  // An export call copies its answer.
  GetPlayersInScope: (source: number) => [...(scopes[source - 1] ?? [])],
};
g.exports = { "ai-core": core };

/** Players within 424 m of each player, through a 424 m grid (stands for ai-core's scope sets). */
function buildScopes(): number[][] {
  const CELL = 424;
  const grid = new Map<string, number[]>();
  players.forEach((p, i) => {
    const key = `${Math.floor(p.x / CELL)}:${Math.floor(p.y / CELL)}`;
    grid.set(key, [...(grid.get(key) ?? []), i]);
  });
  return players.map((p, i) => {
    const out: number[] = [];
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const j of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const q = players[j]!;
          if (j !== i && Math.hypot(q.x - p.x, q.y - p.y) <= CELL)
            out.push(j + 1);
        }
    return out;
  });
}

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
      : `${(ms * 1000).toFixed(1)} µs`;

for (const count of [2048, 10_000]) {
  players = Array.from({ length: count }, (_, i) => ({
    x: ((i * 7919) % 8000) - 4000,
    y: ((i * 104_729) % 8000) - 4000,
  }));
  scopes = buildScopes();
  const avgScope = scopes.reduce((n, s) => n + s.length, 0) / count;
  handlers.clear();
  // Fresh module instances per size (the mirror starts once).
  const { online } = await import(`../src/server/online.ts?${count}`);
  const { nearestPlayerTo, playersNear, playersNearCoords } = await import(
    `../src/server/proximity.ts?${count}`
  );
  const start = time(() => online.size);
  let found = 0;
  const near = time(() => {
    for (let i = 1; i <= 1000; i++) found += playersNear(i, 50).length;
  });
  const nearest = time(() => {
    for (let i = 1; i <= 1000; i++)
      if (nearestPlayerTo(i, 50, (o: number) => o % 2 === 0) !== null) found++;
  });
  const nearCoords = time(() => {
    for (let i = 1; i <= 1000; i++)
      found += playersNearCoords({ x: 0, y: 0, z: 30 }, 50).length;
  });
  const nearCoordsBucket = time(() => {
    for (let i = 1; i <= 1000; i++)
      found += playersNearCoords({ x: 0, y: 0, z: 30 }, 500, 1).length;
  });
  const duty = time(() => {
    for (let i = 0; i < 1000; i++)
      for (const _ of online.onDutyFor("police")) found++;
  });
  // A job channel message / boss menu: the job's members (old way: every online player's job names).
  const members = time(() => {
    for (let i = 0; i < 1000; i++)
      for (const s of online.jobMembers("police"))
        if (online.jobGrade(s, "police") !== null) found++;
  });
  const walkAll = time(() => {
    for (let i = 0; i < 1000; i++)
      for (const s of online.sources())
        if (online.jobs(s).includes("police")) found++;
  });
  // A job change of one player moves it between member sets.
  const jobsChanged = handlers.get("ai-core:jobsChanged")!;
  const change = time(() => {
    for (let i = 1; i <= 1000; i++)
      jobsChanged(i, [{ job: jobs[(i + 1) % jobs.length], grade: 1 }]);
  });
  console.log(
    `${count.toLocaleString("en")} online (~${avgScope.toFixed(0)} in scope): mirror start ${fmt(start)}, playersNear ${fmt(near / 1000)}, nearestPlayerTo ${fmt(nearest / 1000)}, playersNearCoords ${fmt(nearCoords / 1000)} (500 m in bucket 1 ${fmt(nearCoordsBucket / 1000)}), onDutyFor("police") walk ${fmt(duty / 1000)} (${online.onDutyFor("police").size} on duty), jobMembers("police") + grades ${fmt(members / 1000)} vs walking everyone ${fmt(walkAll / 1000)} (${online.jobMembers("police").size} members), one jobsChanged ${fmt(change / 1000)}`,
  );
}
export {};
