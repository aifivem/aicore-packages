import type { Vec3 } from "../shared/vec";

/** Every camera this resource holds: given back to the game camera when the resource stops. */
const cameras = new Set<ScriptCamera>();
on("onClientResourceStop", (resource: string) => {
  if (resource !== GetCurrentResourceName()) return;
  for (const camera of cameras) camera.stop();
});

/**
 * A scripted camera (a shop's showroom view, an editor, a scene): `start` creates and renders it (easing in over
 * `easeMs`), `move` / `pointAt` / `setFov` change it, `stop` eases back to the game camera and destroys it. A camera
 * still running when the resource stops is given back at once.
 */
export class ScriptCamera {
  private handle = 0;

  get active(): boolean {
    return this.handle !== 0;
  }

  /** The game handle (0 while stopped), for natives the class does not wrap. */
  get cam(): number {
    return this.handle;
  }

  start(
    at: Vec3,
    view: { pointAt?: Vec3; rotation?: Vec3; fov?: number } = {},
    easeMs = 0,
  ): void {
    if (!this.handle) {
      this.handle = CreateCam("DEFAULT_SCRIPTED_CAMERA", true);
      cameras.add(this);
    }
    this.move(at, view);
    if (view.fov !== undefined) SetCamFov(this.handle, view.fov);
    SetCamActive(this.handle, true);
    RenderScriptCams(true, easeMs > 0, easeMs, true, true);
  }

  move(at: Vec3, view: { pointAt?: Vec3; rotation?: Vec3 } = {}): void {
    if (!this.handle) return;
    SetCamCoord(this.handle, at.x, at.y, at.z);
    if (view.pointAt) this.pointAt(view.pointAt);
    else if (view.rotation)
      SetCamRot(this.handle, view.rotation.x, view.rotation.y, view.rotation.z, 2);
  }

  pointAt(target: Vec3): void {
    if (this.handle) PointCamAtCoord(this.handle, target.x, target.y, target.z);
  }

  setFov(fov: number): void {
    if (this.handle) SetCamFov(this.handle, fov);
  }

  /** Back to the game camera (easing over `easeMs`) and the camera is destroyed. */
  stop(easeMs = 0): void {
    if (!this.handle) return;
    RenderScriptCams(false, easeMs > 0, easeMs, true, true);
    DestroyCam(this.handle, false);
    this.handle = 0;
    cameras.delete(this);
  }
}
