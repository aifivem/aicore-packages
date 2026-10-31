import type { Vec3 } from "../shared/vec";
import { TickLoop } from "./tickLoop";

/** Where a camera looks: a point it follows, or a fixed rotation (degrees); `fov` in degrees. */
export interface CameraView {
  pointAt?: Vec3;
  rotation?: Vec3;
  fov?: number;
}

/** Depth of field: sharp between `near` and `far` metres, `strength` 0-1. */
export interface CameraBlur {
  near: number;
  far: number;
  strength: number;
}

/** Every camera this resource holds: given back to the game camera when the resource stops. */
const cameras = new Set<ScriptCamera>();
on("onClientResourceStop", (resource: string) => {
  if (resource !== GetCurrentResourceName()) return;
  for (const camera of cameras) camera.stop();
});

/**
 * A scripted camera (a shop's showroom view, an editor, a scene, binoculars): `start` creates and renders it (easing
 * in over `easeMs`), `move` / `pointAt` / `setFov` / `attach` change it, `glideTo` blends to a new shot, `shake` and
 * `blur` add hand shake and depth of field, `stop` eases back to the game camera and destroys it. A camera still
 * running when the resource stops is given back at once.
 */
export class ScriptCamera {
  private handle = 0;
  /** Cameras a `glideTo` blends away from; destroyed after the blend or on `stop`. */
  private readonly retired = new Set<number>();
  private shaking: { type: string; amplitude: number } | null = null;
  private dof: CameraBlur | null = null;
  private readonly hiDof = new TickLoop(() => SetUseHiDof());

  /** `type`: the game camera name (`DEFAULT_SCRIPTED_FLY_CAMERA` for a hand-held view). */
  constructor(private readonly type = "DEFAULT_SCRIPTED_CAMERA") {}

  get active(): boolean {
    return this.handle !== 0;
  }

  /** The game handle (0 while stopped), for natives the class does not wrap. */
  get cam(): number {
    return this.handle;
  }

  start(at: Vec3, view: CameraView = {}, easeMs = 0): void {
    if (!this.handle) {
      this.handle = CreateCam(this.type, true);
      cameras.add(this);
    }
    this.move(at, view);
    if (view.fov !== undefined) SetCamFov(this.handle, view.fov);
    SetCamActive(this.handle, true);
    RenderScriptCams(true, easeMs > 0, easeMs, true, true);
  }

  /** Moves the camera, at once or gliding there over `ms` (the game interpolates). */
  move(at: Vec3, view: CameraView = {}, ms = 0): void {
    if (!this.handle) return;
    if (ms > 0) {
      const [rx = 0, ry = 0, rz = 0] = view.rotation
        ? [view.rotation.x, view.rotation.y, view.rotation.z]
        : GetCamRot(this.handle, 2);
      const fov = view.fov ?? GetCamFov(this.handle);
      SetCamParams(this.handle, at.x, at.y, at.z, rx, ry, rz, fov, ms, 0, 0, 2);
    } else SetCamCoord(this.handle, at.x, at.y, at.z);
    if (view.pointAt) this.pointAt(view.pointAt);
    else if (view.rotation && ms <= 0)
      SetCamRot(
        this.handle,
        view.rotation.x,
        view.rotation.y,
        view.rotation.z,
        2,
      );
  }

  /**
   * Blends to a new shot over `ms`: a second camera at the new place takes over from this one (the old one is
   * destroyed after the blend). Shake and blur carry over. Starts the camera when it is stopped.
   */
  glideTo(at: Vec3, view: CameraView, ms: number): void {
    if (!this.handle || ms <= 0) return this.start(at, view);
    const old = this.handle;
    const r = view.rotation;
    this.handle = CreateCamWithParams(
      this.type,
      at.x,
      at.y,
      at.z,
      r?.x ?? 0,
      r?.y ?? 0,
      r?.z ?? 0,
      view.fov ?? GetCamFov(old),
      false,
      2,
    );
    if (view.pointAt) this.pointAt(view.pointAt);
    if (this.shaking) this.shake(this.shaking.type, this.shaking.amplitude);
    this.blur(this.dof);
    SetCamActiveWithInterp(this.handle, old, ms, 1, 1);
    this.retired.add(old);
    setTimeout(() => {
      if (this.retired.delete(old)) DestroyCam(old, false);
    }, ms + 150);
  }

  /** Follows an entity at `offset` (entity space), turning with it when `relative`. */
  attach(entity: number, offset: Vec3, relative = true): void {
    if (this.handle)
      AttachCamToEntity(
        this.handle,
        entity,
        offset.x,
        offset.y,
        offset.z,
        relative,
      );
  }

  pointAt(target: Vec3): void {
    if (this.handle) PointCamAtCoord(this.handle, target.x, target.y, target.z);
  }

  setFov(fov: number): void {
    if (this.handle) SetCamFov(this.handle, fov);
  }

  /** The game's camera shake (`HAND_SHAKE`, `ROAD_VIBRATION_SHAKE`...); amplitude 0 stops it. */
  shake(type: string, amplitude: number): void {
    this.shaking = amplitude > 0 ? { type, amplitude } : null;
    if (!this.handle) return;
    if (amplitude > 0) ShakeCam(this.handle, type, amplitude);
    else StopCamShaking(this.handle, true);
  }

  /** Depth of field, or null for none (needs a per-frame native, so it runs only while set). */
  blur(dof: CameraBlur | null): void {
    this.dof = dof;
    this.hiDof.set(dof !== null && this.handle !== 0);
    if (!this.handle) return;
    SetCamUseShallowDofMode(this.handle, dof !== null);
    if (!dof) return;
    SetCamNearDof(this.handle, dof.near);
    SetCamFarDof(this.handle, dof.far);
    SetCamDofStrength(this.handle, dof.strength);
  }

  /** Back to the game camera (easing over `easeMs`) and the camera is destroyed. */
  stop(easeMs = 0): void {
    if (!this.handle) return;
    RenderScriptCams(false, easeMs > 0, easeMs, true, true);
    DestroyCam(this.handle, false);
    for (const cam of this.retired) DestroyCam(cam, false);
    this.retired.clear();
    this.hiDof.set(false);
    this.shaking = null;
    this.dof = null;
    this.handle = 0;
    cameras.delete(this);
  }
}
