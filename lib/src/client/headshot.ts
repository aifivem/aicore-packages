import { waitFor } from "../shared";

/**
 * Registers a headshot of a ped and resolves once the game rendered it: the handle and its texture name (a
 * `https://nui-img/<txd>/<txd>` picture), or null after `timeoutMs`. Call `UnregisterPedheadshot(handle)` when it is
 * no longer shown.
 */
export async function pedHeadshot(
  ped: number,
  transparent = false,
  timeoutMs = 5000,
): Promise<{ handle: number; txd: string } | null> {
  if (!DoesEntityExist(ped)) return null;
  const handle = transparent
    ? RegisterPedheadshotTransparent(ped)
    : RegisterPedheadshot(ped);
  const ready = await waitFor(
    () => (IsPedheadshotReady(handle) && IsPedheadshotValid(handle)) || undefined,
    timeoutMs,
  ).catch(() => false);
  if (!ready) {
    UnregisterPedheadshot(handle);
    return null;
  }
  return { handle, txd: GetPedheadshotTxdString(handle) };
}
