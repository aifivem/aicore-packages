// The resource scheduler (`bun bench/scheduler.bench.ts` in packages/lib): natives stubbed, 60 simulated seconds at
// 60 frames a second with N jobs at mixed intervals (one in ten every frame, the rest 100 ms - 10 s), against N
// separate timers walked every frame the way a timer list is (each timer compared, due ones run). JS time only: in the
// game every separate `setTick` / `setInterval` also costs a runtime crossing per frame, the scheduler one.
// Last run (2026-10-31): 10 / 100 / 1000 jobs = 0.4 / 0.8 / 1.6 µs a frame against 0.3 / 1.6 / 14.6 µs for separate
// timers; a frame with nothing due 0.02 µs; switching a per-frame job on or off every frame adds nothing measurable.
const g = globalThis as Record<string, unknown>;
let now = 0;
g.GetGameTimer = () => now;
g.GetCurrentResourceName = () => "bench";
const timer: { tick: (() => void) | null } = { tick: null };
g.setTick = (fn: () => void) => {
  timer.tick = fn;
  return 1;
};
g.clearTick = () => {
  timer.tick = null;
};

const { every } = await import("../src/fivem/scheduler");

const FRAME = 1000 / 60;
const FRAMES = 60 * 60;
const INTERVALS = [100, 200, 250, 500, 1000, 2000, 5000, 10_000];
const intervalOf = (i: number): number =>
  i % 10 === 0 ? 0 : (INTERVALS[i % INTERVALS.length] ?? 1000);
const fmt = (ms: number): string => `${(ms * 1000).toFixed(2)} µs`;

for (const count of [10, 100, 1000]) {
  let runs = 0;
  const work = (): void => {
    runs++;
  };
  // Scheduler.
  now = 0;
  const jobs = [];
  for (let i = 0; i < count; i++) {
    now = Math.floor(Math.random() * 1000); // jobs switched on at different moments
    jobs.push(every(intervalOf(i), work));
  }
  now = 1000;
  for (let f = 0; f < 120; f++) {
    now += FRAME;
    timer.tick?.();
  }
  runs = 0;
  let t = performance.now();
  for (let f = 0; f < FRAMES; f++) {
    now += FRAME;
    timer.tick?.();
  }
  const scheduler = (performance.now() - t) / FRAMES;
  const schedulerRuns = runs;
  // Idle frames: only jobs of 10 s, nothing due.
  for (const job of jobs) job.stop();
  const slow = Array.from({ length: count }, () => every(10_000, work));
  t = performance.now();
  for (let f = 0; f < FRAMES; f++) {
    now += 1;
    timer.tick?.();
  }
  const idle = (performance.now() - t) / FRAMES;
  // Switching a per-frame job on and off (a TickLoop following zone enters / exits) while the others run.
  const toggled = every(0, work, { active: false });
  t = performance.now();
  for (let f = 0; f < FRAMES; f++) {
    toggled.set(f % 2 === 0);
    now += FRAME;
    timer.tick?.();
  }
  const toggle = (performance.now() - t) / FRAMES;
  for (const job of slow) job.stop();
  toggled.stop();

  // Separate timers.
  const timers = Array.from({ length: count }, (_, i) => ({
    interval: intervalOf(i),
    next: 1000 + Math.floor(Math.random() * 1000),
    fn: work,
  }));
  now = 1000;
  runs = 0;
  t = performance.now();
  for (let f = 0; f < FRAMES; f++) {
    now += FRAME;
    for (const timer of timers) {
      if (now < timer.next) continue;
      timer.next = now + timer.interval;
      timer.fn();
    }
  }
  const separate = (performance.now() - t) / FRAMES;
  console.log(
    `${count} jobs: scheduler ${fmt(scheduler)} / frame (${(schedulerRuns / 60).toFixed(0)} runs/s, 1 tick handler), separate ${fmt(separate)} / frame (${(runs / 60).toFixed(0)} runs/s, ${count} handlers); idle frame ${fmt(idle)}; with a job switched every frame ${fmt(toggle)}`,
  );
}

export {};
