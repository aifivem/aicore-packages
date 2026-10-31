import { CORE, LIB_UI, type ServerProgress } from "@aicore-fivem/shared";
import { triggerClientCallback } from "./callback";
import { PlayerMap } from "./players";

export interface ProgressForOptions extends ServerProgress {
  /** The answer counts only after this share of `duration` passed on the server (default 0.8). */
  minRatio?: number;
}

/** Slack on top of the duration for turning, loading the animation and the round trip. */
const TIMEOUT_SLACK_MS = 15_000;

/** The running server progress of each player: settling it with false ends the waiting flow. */
const running = new PlayerMap<(ok: boolean) => void>({
  onDrop: (_source, settle) => settle(false),
});
on(CORE.playerUnloadedEvent, (source: number) => {
  const settle = running.get(source);
  if (settle) settle(false);
});

/**
 * Runs ai-lib's progress bar (animation or scenario, `face`, blocked controls) on the player's client and resolves
 * true only when it ran out there and at least `minRatio` of `duration` passed on the server; false on cancel, drop,
 * character switch, timeout or a too-early answer. One per player: a second call ends the first with false. Check the
 * flow's conditions again after it resolves (the player may have walked away). The label is a translated text.
 */
export function progressFor(
  source: number,
  options: ProgressForOptions,
): Promise<boolean> {
  const previous = running.get(source);
  if (previous) {
    previous(false);
    emitNet(LIB_UI.progressForCancelEvent, source);
  }
  const { minRatio = 0.8, ...bar } = options;
  const startedAt = GetGameTimer();
  return new Promise((resolve) => {
    let done = false;
    const settle = (ok: boolean) => {
      if (done) return;
      done = true;
      if (running.get(source) === settle) running.delete(source);
      resolve(ok);
    };
    running.set(source, settle);
    triggerClientCallback(
      LIB_UI.progressForCallback,
      source,
      [bar],
      bar.duration + TIMEOUT_SLACK_MS,
    ).then(
      (answer) =>
        settle(
          answer === true &&
            GetGameTimer() - startedAt >= bar.duration * minRatio,
        ),
      () => settle(false),
    );
  });
}
