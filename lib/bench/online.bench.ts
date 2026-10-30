// Online mirror and proximity at scale (`bun bench/online.bench.ts` in packages/lib): natives stubbed, N players spread
// over the map (8 km square). Times the mirror's start, the scope seed (grid) and one playersNear / onDutyFor read.
// Online counts stop at 10k: FiveM caps a server at 2048 players (OneSync), so 100k online cannot happen.
// Last run: 2,048 online: start 4 ms, seed 18 ms, near 6 µs; 10,000 online: start 5 ms, seed 255 ms, near 21 µs.
const g = globalThis as Record<string, unknown>
let players: { x: number; y: number }[] = []
const handlers = new Map<string, (...args: unknown[]) => void>()
g.GetCurrentResourceName = () => "bench"
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  handlers.set(name, fn)
g.GetNumPlayerIndices = () => players.length
g.GetPlayerFromIndex = (i: number) => String(i + 1)
g.GetPlayerPed = (source: string) => Number(source)
g.GetEntityCoords = (ped: number) => {
  const p = players[ped - 1]
  return p ? [p.x, p.y, 30] : [0, 0, 0]
}
const jobs = ["police", "ambulance", "mechanic", "taxi", "unemployed"]
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
}
g.exports = { "ai-core": core }

const time = (fn: () => unknown): number => {
  const start = performance.now()
  fn()
  return performance.now() - start
}
const fmt = (ms: number): string =>
  ms >= 1000
    ? `${(ms / 1000).toFixed(2)} s`
    : ms >= 1
      ? `${ms.toFixed(1)} ms`
      : `${(ms * 1000).toFixed(1)} µs`

for (const count of [2048, 10_000]) {
  players = Array.from({ length: count }, (_, i) => ({
    x: ((i * 7919) % 8000) - 4000,
    y: ((i * 104_729) % 8000) - 4000,
  }))
  handlers.clear()
  // Fresh module instances per size (the mirror and the scopes start once).
  const { online } = await import(`../src/server/online.ts?${count}`)
  const { playersNear } = await import(`../src/server/proximity.ts?${count}`)
  const start = time(() => online.size)
  const seed = time(() => playersNear(1, 50))
  let found = 0
  const near = time(() => {
    for (let i = 1; i <= 1000; i++) found += playersNear(i, 50).length
  })
  const duty = time(() => {
    for (let i = 0; i < 1000; i++)
      for (const _ of online.onDutyFor("police")) found++
  })
  console.log(
    `${count.toLocaleString("en")} online: mirror start ${fmt(start)}, scope seed ${fmt(seed)}, playersNear ${fmt(near / 1000)}, onDutyFor("police") walk ${fmt(duty / 1000)} (${online.onDutyFor("police").size} on duty)`
  )
}
export {}
