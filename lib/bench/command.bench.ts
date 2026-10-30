// addCommand at scale (`bun bench/command.bench.ts` in packages/lib): natives stubbed, N commands registered in one
// resource, then one player's suggestion refresh (first send, then an unchanged one) and one command run timed.
// Last run: 100,000 commands add 301 ms / first refresh 161 ms / unchanged refresh 186 ms / run 0.6 ms;
// 1,100,000 commands add 4.1 s / first refresh 4.2 s / unchanged refresh 2.3 s / run 0.2 ms. A refresh is linear in
// the resource's commands (one ACE check per name), once per character load or job/gang change.
const g = globalThis as Record<string, unknown>;
const handlers = new Map<
  string,
  (source: number, args: string[], raw: string) => void
>();
const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
let sentSuggestions = 0;
let ran = 0;
g.GetCurrentResourceName = () => "bench";
g.GetResourceState = () => "missing";
g.GetPlayerName = (id: string) => (id === "1" ? "bench" : null);
g.IsPlayerAceAllowed = (_player: string, ace: string) => ace === "ai.admin";
g.RegisterCommand = (
  name: string,
  fn: (source: number, args: string[], raw: string) => void,
) => handlers.set(name, fn);
g.getPlayers = () => [];
g.emitNet = (name: string, _target: number, list?: unknown[]) => {
  if (name === "chat:addSuggestions" && Array.isArray(list))
    sentSuggestions += list.length;
};
g.on = (name: string, fn: (...args: unknown[]) => void) =>
  listeners.set(name, [...(listeners.get(name) ?? []), fn]);
// The flush runs on the next tick; called by hand below.
const tick: { flush: (() => void) | null } = { flush: null };
g.setImmediate = (fn: () => void) => {
  tick.flush = fn;
};

const { addCommand } = await import("../src/server/command");
const refresh = (source: number) => {
  for (const fn of listeners.get("ai-core:playerLoaded") ?? []) fn(source);
};

let total = 0;
for (const count of [100_000, 1_000_000]) {
  const t0 = performance.now();
  for (let i = total; i < total + count; i++) {
    addCommand(
      [`cmd${i}`, `c${i}`],
      {
        help: "help",
        restricted: i % 2 === 0,
        params: [
          { name: "id", type: "playerId" },
          { name: "amount", type: "number", optional: true },
        ],
      },
      () => void ran++,
    );
  }
  total += count;
  tick.flush?.();
  const t1 = performance.now();
  sentSuggestions = 0;
  refresh(1);
  const first = sentSuggestions;
  const t2 = performance.now();
  refresh(1);
  const t3 = performance.now();
  handlers.get("cmd0")?.(1, ["1", "5"], "cmd0 1 5");
  const t4 = performance.now();
  console.log(
    `${total.toLocaleString("en-US")} commands: add ${(t1 - t0).toFixed(0)} ms, first refresh ${(t2 - t1).toFixed(0)} ms (${first} suggestions), ` +
      `unchanged refresh ${(t3 - t2).toFixed(0)} ms, one run ${((t4 - t3) * 1000).toFixed(0)} µs (ran ${ran})`,
  );
}

export {};
