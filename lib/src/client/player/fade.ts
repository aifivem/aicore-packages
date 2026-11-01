import { waitFor } from "../../shared";

/** Fades the screen out and resolves once it is black. */
export async function fadeOut(ms = 300): Promise<void> {
  DoScreenFadeOut(ms);
  await waitFor(() => IsScreenFadedOut() || undefined, ms + 2000).catch(
    () => undefined,
  );
}

/** Fades the screen back in and resolves when it is clear (or after `ms` + 2 s); the pair of `fadeOut`. */
export async function fadeIn(ms = 400): Promise<void> {
  DoScreenFadeIn(ms);
  await waitFor(() => IsScreenFadedIn() || undefined, ms + 2000).catch(
    () => undefined,
  );
}
