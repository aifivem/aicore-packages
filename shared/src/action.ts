/**
 * What every client action answers: ok, or a lang key the client shows. Extra fields ride on the ok branch
 * (`ActionResult<{ id: number }>`); the new state itself arrives as a delta, never in the reply.
 */
export type ActionResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: string };
