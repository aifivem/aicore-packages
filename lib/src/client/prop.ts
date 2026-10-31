import { onStop } from "../fivem/byResource";
import { cache } from "./cache";
import { requestModel } from "./streaming";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AttachPropOptions {
  /** The ped that holds it (default the local ped). */
  ped?: number;
  /** Ped bone id (`57005` right hand), turned into the index with `GetPedBoneIndex`. */
  bone: number;
  offset?: Vec3;
  rotation?: Vec3;
  /** The prop collides (default false). */
  collision?: boolean;
  /** `AttachEntityToEntity`'s rotation order (default 2, R*'s). */
  rotationOrder?: number;
}

/** Props made by `attachProp` (with their model, so a reused handle is never deleted), removed when this resource stops. */
const props = new Map<number, number>();
let cleaning = false;

/**
 * A local prop held by a ped at a bone: resolves the entity, or 0 when the model does not load or the ped is gone.
 * The caller deletes it (`DeleteEntity`); whatever is left goes when the resource stops.
 */
export async function attachProp(
  model: string | number,
  options: AttachPropOptions,
): Promise<number> {
  const hash = await requestModel(model).catch(() => 0);
  const ped = options.ped ?? cache.ped;
  if (!hash) return 0;
  if (!DoesEntityExist(ped)) {
    SetModelAsNoLongerNeeded(hash);
    return 0;
  }
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
  const prop = CreateObject(hash, x, y, z, false, false, false);
  SetModelAsNoLongerNeeded(hash);
  const collision = options.collision ?? false;
  if (!collision) SetEntityCollision(prop, false, false);
  const o = options.offset ?? { x: 0, y: 0, z: 0 };
  const r = options.rotation ?? { x: 0, y: 0, z: 0 };
  AttachEntityToEntity(
    prop,
    ped,
    GetPedBoneIndex(ped, options.bone),
    o.x,
    o.y,
    o.z,
    r.x,
    r.y,
    r.z,
    true,
    true,
    collision,
    false,
    options.rotationOrder ?? 2,
    true,
  );
  for (const [made, m] of props)
    if (!DoesEntityExist(made) || GetEntityModel(made) !== m) props.delete(made);
  props.set(prop, GetEntityModel(prop));
  if (!cleaning) {
    cleaning = true;
    onStop(() => {
      for (const [made, m] of props)
        if (DoesEntityExist(made) && GetEntityModel(made) === m)
          DeleteEntity(made);
    });
  }
  return prop;
}
