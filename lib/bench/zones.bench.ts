// Zones at scale (`bun bench/zones.bench.ts` in packages/lib): natives stubbed, N zones spread over the map, then
// one check timed. Last run: 100,000 zones add 264 ms / check 5 µs; 1,000,000 zones add 3 s / check 46 µs.
const g = globalThis as Record<string, unknown>;
let player = { x: 0, y: 0, z: 30 };
let now = 0;
g.GetCurrentResourceName = () => "bench";
g.GetGameTimer = () => now;
g.PlayerPedId = () => 1;
g.GetEntityCoords = () => [player.x, player.y, player.z];
// The lib cache reads these once at load.
g.PlayerId = () => 0;
g.GetPlayerServerId = () => 1;
g.GetVehiclePedIsIn = () => 0;
g.GetVehicleMaxNumberOfPassengers = () => 0;
g.GetSelectedPedWeapon = () => 0;
g.GetHashKey = () => 0;
g.on = () => undefined;
// The timer is driven by hand below.
const timer: { tick: (() => void) | null } = { tick: null };
g.setInterval = (fn: () => void) => {
  timer.tick = fn;
  return 1;
};
g.clearInterval = () => {
  timer.tick = null;
};

const { Zones } = await import("../src/client/zones");

for (const count of [100_000, 1_000_000]) {
  const zones = new Zones();
  let enters = 0;
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    const center = { x: rand(-4000, 4000), y: rand(-4000, 8000), z: rand(0, 300) };
    zones.add(`z${i}`, {
      shape: i % 3 === 0 ? { type: "sphere", center, radius: rand(2, 20) } : { type: "cylinder", center, radius: rand(2, 20), height: 4 },
      interval: i % 2 ? 500 : 1000,
      onEnter: () => enters++,
    });
  }
  const t1 = performance.now();
  const checks = 2_000;
  for (let i = 0; i < checks; i++) {
    now += 1_000;
    player = { x: rand(-4000, 4000), y: rand(-4000, 8000), z: rand(0, 300) };
    timer.tick?.();
  }
  const t2 = performance.now();
  console.log(
    `${count.toLocaleString("en-US")} zones: add ${(t1 - t0).toFixed(0)} ms, one check ${(((t2 - t1) / checks) * 1000).toFixed(1)} µs (enters ${enters})`,
  );
}

export {};
