import { waitFor } from "../shared";

/**
 * Loads a model and resolves with its hash. Rejects when the model does not exist or does not load in time.
 * Call `SetModelAsNoLongerNeeded(hash)` once the entity is created.
 */
export async function requestModel(
  model: string | number,
  timeoutMs = 10_000,
): Promise<number> {
  const hash = typeof model === "number" ? model : GetHashKey(model);
  if (!IsModelInCdimage(hash)) throw new Error(`model ${model} does not exist`);
  RequestModel(hash);
  await waitFor(() => HasModelLoaded(hash) || undefined, timeoutMs);
  return hash;
}

/** Loads an animation dictionary. Call `RemoveAnimDict(dict)` when it is no longer played. */
export async function requestAnimDict(
  dict: string,
  timeoutMs = 10_000,
): Promise<string> {
  if (!DoesAnimDictExist(dict))
    throw new Error(`anim dict ${dict} does not exist`);
  RequestAnimDict(dict);
  await waitFor(() => HasAnimDictLoaded(dict) || undefined, timeoutMs);
  return dict;
}

/** Loads a particle asset. Call `RemoveNamedPtfxAsset(asset)` when done. */
export async function requestPtfxAsset(
  asset: string,
  timeoutMs = 10_000,
): Promise<string> {
  RequestNamedPtfxAsset(asset);
  await waitFor(() => HasNamedPtfxAssetLoaded(asset) || undefined, timeoutMs);
  return asset;
}

/** Loads a movement clipset (crouch walk, injured walk). Call `RemoveAnimSet(set)` when it is no longer used. */
export async function requestAnimSet(
  set: string,
  timeoutMs = 10_000,
): Promise<string> {
  RequestAnimSet(set);
  await waitFor(() => HasAnimSetLoaded(set) || undefined, timeoutMs);
  return set;
}

/** Loads a streamed texture dictionary. Call `SetStreamedTextureDictAsNoLongerNeeded(dict)` when done. */
export async function requestTextureDict(
  dict: string,
  timeoutMs = 10_000,
): Promise<string> {
  RequestStreamedTextureDict(dict, false);
  await waitFor(
    () => HasStreamedTextureDictLoaded(dict) || undefined,
    timeoutMs,
  );
  return dict;
}

/** Loads a weapon's model and assets and resolves with its hash. Call `RemoveWeaponAsset(hash)` when done. */
export async function requestWeaponAsset(
  weapon: string | number,
  timeoutMs = 10_000,
): Promise<number> {
  const hash = typeof weapon === "number" ? weapon : GetHashKey(weapon);
  RequestWeaponAsset(hash, 31, 0);
  await waitFor(() => HasWeaponAssetLoaded(hash) || undefined, timeoutMs);
  return hash;
}
