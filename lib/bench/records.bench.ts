// RecordObjects and ByResource at scale (`bun bench/records.bench.ts` in packages/lib), natives stubbed.
// RecordObjects: 100k / 1M records, the start build, then one record edited (must stay O(1): only its objects).
// ByResource: 100k / 1M entries over 200 resources, one resource stopping (O(its entries)).
// Last run: see the `aicore-fivem` skill's references/scale.md.
const g = globalThis as Record<string, unknown>;
const stops: Array<(resource: string) => void> = [];
g.IsDuplicityVersion = () => true;
g.GetInvokingResource = () => null;
g.GetCurrentResourceName = () => "bench";
g.on = (_: string, fn: (resource: string) => void) => stops.push(fn);

const { RecordObjects } = await import("../src/shared/records");
const { ByResource } = await import("../src/fivem/byResource");

const time = (fn: () => unknown): number => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};
const fmt = (ms: number): string =>
  ms >= 1 ? `${ms.toFixed(1)} ms` : `${(ms * 1000).toFixed(2)} µs`;

for (const n of [100_000, 1_000_000]) {
  const raw: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < n; i++) raw[`r${i}`] = { x: i, y: i };
  const map = new Map<string, { x: number }>();
  let handler: (key: string | undefined) => void = () => undefined;
  const source = {
    records: <T>(_file: string, readOne: (k: string, v: Record<string, unknown>) => T | null) => {
      for (const [k, v] of Object.entries(raw)) {
        const parsed = readOne(k, v);
        if (parsed !== null) map.set(k, parsed as unknown as { x: number });
      }
      return map as unknown as ReadonlyMap<string, T>;
    },
    onChange: (_file: string, h: (key: string | undefined) => void) => {
      handler = h;
    },
  };
  let built = 0;
  let removed = 0;
  let objects: RecordObjects<{ x: number }> | undefined;
  const start = time(() => {
    objects = new RecordObjects(source, "f", (_k, v) => ({ x: Number(v.x) }), () => {
      built++;
      return () => removed++;
    });
  });
  built = 0;
  const edit = time(() => {
    map.set("r42", { x: -1 });
    handler("r42");
  });
  console.log(
    `RecordObjects ${n.toLocaleString("en")} records: start ${fmt(start)} | one edit ${fmt(edit)} (built ${built}, removed ${removed})${objects ? "" : ""}`,
  );

  const owned = new ByResource<number, number>();
  const fill = time(() => {
    for (let i = 0; i < n; i++) owned.set(i, i, `res${i % 200}`);
  });
  const stop = time(() => {
    for (const s of stops) s("res7");
  });
  console.log(
    `ByResource ${n.toLocaleString("en")} entries / 200 resources: fill ${fmt(fill)} | one resource stops ${fmt(stop)} (left ${owned.size})`,
  );

}
