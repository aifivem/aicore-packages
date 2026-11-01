// Client pool walks (`bun bench/entities.bench.ts` in packages/lib): natives stubbed, entities spread over a 400 m
// square around the player. GTA's pools hold far less than 100k: CPed 256, CVehicle 300 (raised gameconfigs: ~512),
// CObject ~2,300 (raised: ~10,000), so the sizes timed are those plus 10k as a worst case. Each call is one
// GetGamePool walk with one GetEntityCoords per entity; the stub's array per call stands for the native's result.
// Times nearestEntity (ped / object), nearestVehicle (with `from`), entitiesInArea and isSpawnClear.
const g = globalThis as Record<string, unknown>;
g.GetCurrentResourceName = () => "bench";
g.PlayerPedId = () => 1;
g.PlayerId = () => 0;
g.GetPlayerServerId = () => 1;
g.GetVehiclePedIsIn = () => 0;
g.GetVehicleMaxNumberOfPassengers = () => 0;
g.GetSelectedPedWeapon = () => 0;
g.GetHashKey = () => 0;
g.on = () => undefined;
g.NetworkGetEntityIsNetworked = () => true;

let coords = new Float32Array(0);
let pool: number[] = [];
g.GetGamePool = () => pool;
g.GetEntityCoords = (entity: number) => {
  const i = (entity - 2) * 3;
  return entity === 1 ? [0, 0, 30] : [coords[i], coords[i + 1], coords[i + 2]];
};

const { nearestEntity, entitiesInArea, isSpawnClear } =
  await import("../src/client/entities");
const { nearestVehicle } = await import("../src/client/vehicles");

const RUNS = 1000;
const time = (fn: () => unknown): number => {
  const start = performance.now();
  for (let i = 0; i < RUNS; i++) fn();
  return (performance.now() - start) / RUNS;
};
const fmt = (ms: number): string =>
  ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(1)} µs`;

const here = { x: 0, y: 0, z: 30 };
for (const n of [300, 2_500, 10_000]) {
  coords = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 3) {
    coords[i] = Math.random() * 400 - 200;
    coords[i + 1] = Math.random() * 400 - 200;
    coords[i + 2] = 30;
  }
  pool = Array.from({ length: n }, (_, i) => i + 2);
  let found = 0;
  const nearest = time(() => {
    if (nearestEntity("object", here, 50)) found++;
  });
  const nearestFiltered = time(() => {
    if (
      nearestEntity("ped", undefined, Infinity, { filter: (e) => e % 2 === 0 })
    )
      found++;
  });
  const vehicle = time(() => {
    if (nearestVehicle(10, { from: here })) found++;
  });
  const area = time(() => {
    found += entitiesInArea("vehicle", here, 25).length;
  });
  // A spot nobody stands near: the whole pool is walked.
  const clear = time(() => {
    if (isSpawnClear({ x: 5000, y: 5000, z: 30 }, 3)) found++;
  });
  console.log(
    `${n.toLocaleString("en")} in the pool: nearestEntity ${fmt(nearest)}, with a filter and no limit ${fmt(nearestFiltered)}, nearestVehicle(from) ${fmt(vehicle)}, entitiesInArea ${fmt(area)}, isSpawnClear (free spot, full walk) ${fmt(clear)} (${found})`,
  );
}
export {};
