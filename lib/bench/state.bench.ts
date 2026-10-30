// State mirror at scale (`bun bench/state.bench.ts` in packages/lib): natives stubbed, N entities with a `fuel` bag.
// "raw" stands for `Entity(e).state.fuel` as FiveM's JS runtime does it: two proxies, the netId natives, a copy of
// the stored msgpack and its decode (here a JSON round trip stands in for the engine's copies and msgpack decode).
// "mirror" is lib `EntityState.get` after the change handler filled it. Times a full pass reading every entity.
// Last run: 100k: raw 111 ms, mirror 14 ms (8x, 138 ns a read); 1M: raw 962 ms, mirror 120 ms (8x). The stub leaves out
// the real native calls (2-3 per raw read, each a runtime crossing) and the engine locks, so the real gap is wider.
const g = globalThis as Record<string, unknown>;
type Handler = (bag: string, key: string, value: unknown) => void;
const handlers: Handler[] = [];
const stored = new Map<string, string>();
g.IsDuplicityVersion = () => true;
g.on = () => undefined;
g.setInterval = () => 0;
g.AddStateBagChangeHandler = (_key: string, _bag: string, fn: Handler) => handlers.push(fn);
g.GetEntityFromStateBagName = (bag: string) => Number(bag.slice(7));
g.NetworkGetNetworkIdFromEntity = (entity: number) => entity;
g.NetworkGetEntityIsNetworked = () => true;
g.Entity = (entity: number) => ({
  state: new Proxy(
    {},
    { get: (_t, k) => JSON.parse(stored.get(`entity:${entity}:${String(k)}`) ?? "null") as unknown },
  ),
});

const { EntityState, stateNumber } = await import("../src/fivem/state");

const time = (fn: () => unknown): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

for (const n of [100_000, 1_000_000]) {
  stored.clear();
  handlers.length = 0;
  const fuel = new EntityState("fuel", stateNumber);
  const fill = time(() => {
    for (let e = 1; e <= n; e++) {
      const value = (e % 100) + 0.5;
      stored.set(`entity:${e}:fuel`, JSON.stringify(value));
      for (const h of handlers) h(`entity:${e}`, "fuel", value);
    }
  });
  let sum = 0;
  const raw = time(() => {
    for (let e = 1; e <= n; e++) {
      const v: unknown = (g.Entity as (e: number) => { state: Record<string, unknown> })(e).state.fuel;
      if (typeof v === "number") sum += v;
    }
  });
  const mirror = time(() => {
    for (let e = 1; e <= n; e++) sum += fuel.get(e) ?? 0;
  });
  console.log(
    `${n.toLocaleString("en")} entities: fill ${fill.toFixed(0)} ms, raw pass ${raw.toFixed(0)} ms, mirror pass ${mirror.toFixed(0)} ms (${(raw / mirror).toFixed(1)}x), per read ${((mirror / n) * 1e6).toFixed(0)} ns (${sum > 0})`,
  );
}
