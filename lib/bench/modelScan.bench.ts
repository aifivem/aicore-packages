// The model point scan at scale (`bun bench/modelScan.bench.ts` in packages/lib): natives stubbed, N objects in the
// object pool, 1,000 model points of many resources in one scanner (as ai-lib holds them), then scans timed while
// the player moves. Last run: 100,000 objects one scan 172 µs, 1,000,000 objects 169 µs (3,150 stubbed closest-object
// queries per scan from the 900 few-model points; the object index is a 64 m grid, so its cost does not grow with the pool).
const g = globalThis as Record<string, unknown>;
let player = { x: 0, y: 0, z: 30 };
g.GetCurrentResourceName = () => "bench";
g.PlayerPedId = () => 1;
g.PlayerId = () => 0;
g.GetPlayerServerId = () => 1;
g.GetVehiclePedIsIn = () => 0;
g.GetVehicleMaxNumberOfPassengers = () => 0;
g.GetSelectedPedWeapon = () => 0;
g.GetHashKey = () => 0;
g.on = () => undefined;
const timer: { tick: (() => void) | null } = { tick: null };
g.setTick = (fn: () => void) => {
  timer.tick = fn;
  return 1;
};
g.clearTick = () => {
  timer.tick = null;
};
let now = 0;
g.GetGameTimer = () => now;

// The world: entity ids from 2, models 1..2000, spread over the map; vehicles separate.
const rand = (min: number, max: number) => min + Math.random() * (max - min);
let models = new Int32Array(0);
let coords = new Float32Array(0);
let objectPool: number[] = [];
const VEHICLES = 2_000;
const vehicleBase = 100_000_000;
const vehicleCoords = new Float32Array(VEHICLES * 3);
for (let i = 0; i < VEHICLES * 3; i += 3) {
  vehicleCoords[i] = rand(-4000, 4000);
  vehicleCoords[i + 1] = rand(-4000, 8000);
  vehicleCoords[i + 2] = rand(0, 100);
}
const vehiclePool = Array.from({ length: VEHICLES }, (_, i) => vehicleBase + i);
g.GetGamePool = (kind: string) =>
  kind === "CVehicle" ? vehiclePool : objectPool;
g.GetEntityModel = (e: number) =>
  e >= vehicleBase ? 5000 + ((e - vehicleBase) % 50) : (models[e] ?? 0);
g.GetEntityCoords = (e: number) => {
  if (e === 1) return [player.x, player.y, player.z];
  const list = e >= vehicleBase ? vehicleCoords : coords;
  const i = (e >= vehicleBase ? e - vehicleBase : e) * 3;
  return [list[i], list[i + 1], list[i + 2]];
};
g.DoesEntityExist = () => true;
g.NetworkGetEntityIsNetworked = () => true;
let closestCalls = 0;
g.GetClosestObjectOfType = () => {
  closestCalls++;
  return 0;
};

const { ModelScanner } = await import("../src/client/modelScan/scanner");

for (const count of [100_000, 1_000_000]) {
  models = new Int32Array(count + 2);
  coords = new Float32Array((count + 2) * 3);
  objectPool = [];
  for (let e = 2; e < count + 2; e++) {
    models[e] = 1 + Math.floor(Math.random() * 2000);
    coords[e * 3] = rand(-4000, 4000);
    coords[e * 3 + 1] = rand(-4000, 8000);
    coords[e * 3 + 2] = rand(0, 100);
    objectPool.push(e);
  }
  const scanner = new ModelScanner();
  let changes = 0;
  const onNearest = () => changes++;
  const t0 = performance.now();
  // 900 points with 1-6 models (ATMs, pumps), 50 with 300 models (seats: the object index), 50 vehicle points.
  for (let i = 0; i < 900; i++)
    scanner.add(
      `direct${i}`,
      {
        models: Array.from(
          { length: 1 + (i % 6) },
          (_, k) => 1 + ((i + k) % 2000),
        ),
        vehicles: false,
        radius: 1.5,
        inVehicle: false,
      },
      onNearest,
    );
  for (let i = 0; i < 50; i++)
    scanner.add(
      `many${i}`,
      {
        models: Array.from({ length: 300 }, (_, k) => 1 + ((i * 7 + k) % 2000)),
        vehicles: false,
        radius: 2,
        inVehicle: false,
      },
      onNearest,
    );
  for (let i = 0; i < 50; i++)
    scanner.add(
      `veh${i}`,
      {
        models: i % 2 ? [] : [5000 + i],
        vehicles: true,
        radius: 3,
        inVehicle: false,
      },
      onNearest,
    );
  const t1 = performance.now();
  // A full walk of the pool, so the index holds every match, then timed scans.
  const walk = Math.ceil(count / 300) + 1;
  for (let i = 0; i < walk; i++) {
    now += 500;
    player = { x: rand(-4000, 4000), y: rand(-4000, 8000), z: rand(0, 100) };
    timer.tick?.();
  }
  const t2 = performance.now();
  const scans = 2_000;
  closestCalls = 0;
  for (let i = 0; i < scans; i++) {
    now += 500;
    // Next to a random object, so matches are found.
    const e = 2 + Math.floor(Math.random() * count);
    player = {
      x: coords[e * 3] ?? 0,
      y: coords[e * 3 + 1] ?? 0,
      z: coords[e * 3 + 2] ?? 0,
    };
    timer.tick?.();
  }
  const t3 = performance.now();
  console.log(
    `${count.toLocaleString("en-US")} objects, 1,000 points: add ${(t1 - t0).toFixed(1)} ms, first full walk ${walk} scans ${(t2 - t1).toFixed(0)} ms, one scan ${(((t3 - t2) / scans) * 1000).toFixed(1)} µs (closest-object queries per scan ${(closestCalls / scans).toFixed(0)}, changes ${changes})`,
  );
  for (const key of ["direct", "many", "veh"])
    for (let i = 0; i < 900; i++) scanner.remove(`${key}${i}`);
}

export {};
