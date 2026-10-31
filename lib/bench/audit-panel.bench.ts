// Stability audit: admin panel on-demand record loading and world-change replies at robberies scale and beyond
// (`bun bench/audit-panel.bench.ts` in packages/lib). Measures what one `panelData` reply (AdminPanelSnapshot().data)
// and one `worldChanges` reply weigh and cost, since both go back as ordinary (non-latent) callback events.
import { readFileSync } from "node:fs";
import { clone } from "../src/server/admin/patch";

const ROOT = "../../resources/[ai]/ai-robberies/data";
const read = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(`${ROOT}/${file}.json`, "utf8")) as Record<
    string,
    unknown
  >;

const time = (fn: () => unknown, runs = 5): number => {
  fn();
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - start) / runs;
};
const kb = (value: unknown): string =>
  `${(Buffer.byteLength(JSON.stringify(value)) / 1024).toFixed(0)} KB`;

const places = read("places");
const targets = read("targets");
const real = { settings: read("settings"), places, targets };
console.log(
  `ai-robberies real data: ${Object.keys(places).length - 1} places, ${Object.keys(targets).length - 1} targets`,
);
console.log(
  `  panelData reply (whole data): ${kb(real)} JSON, clone ${time(() => clone(real)).toFixed(2)} ms`,
);

// Synthetic: N targets shaped like the real ones (the data rule plans for 10k places).
const sample = Object.entries(targets).find(([k]) => k !== "$schema")?.[1];
for (const n of [10_000, 100_000]) {
  const big: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) big[`t${i}`] = sample;
  const data = { places, targets: big };
  const labels: Record<string, string> = {};
  const indexMs = time(() => {
    for (const key of Object.keys(big)) labels[key] = key;
  });
  console.log(
    `  ${n} targets: panelData ${kb(data)}, clone ${time(() => clone(data), 2).toFixed(1)} ms; summary index ${kb(labels)} (${indexMs.toFixed(1)} ms)`,
  );
}
