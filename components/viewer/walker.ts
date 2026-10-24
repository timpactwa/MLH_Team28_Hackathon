import type { Camera } from "three";

/** Scene units are meters; the room model is in inches. */
export const IN = 0.0254;
const EYE = 62 * IN;
const MARGIN = 10 * IN;
const WALK_SPEED = 1.4; // m/s
const TURN_SPEED = 1.6; // rad/s
const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

export interface Pose {
  x: number;
  z: number;
  /** 0 looks toward -z (north). */
  yaw: number;
}

/**
 * First-person walk state, kept outside React so pointer, keyboard and frame updates can mutate it freely.
 * Positions are clamped to the room; furniture is not a collider.
 */
export class Walker {
  private keys = new Set<string>();
  private lookDx = 0;
  private lookDy = 0;
  private target: { x: number; z: number } | null = null;
  private pose: Pose & { pitch: number } = { x: 0, z: 0, yaw: 0, pitch: 0 };
  private width = 1;
  private depth = 1;

  reset(start: Pose, width: number, depth: number) {
    this.pose = { ...start, pitch: -0.2 };
    this.width = width;
    this.depth = depth;
    this.target = null;
    this.keys.clear();
  }

  /** Returns true if the key is a walk key and was consumed. */
  keyDown(key: string): boolean {
    const k = key.toLowerCase();
    if (!MOVE_KEYS.includes(k)) return false;
    this.keys.add(k);
    return true;
  }

  keyUp(key: string) {
    this.keys.delete(key.toLowerCase());
  }

  releaseAll() {
    this.keys.clear();
  }

  look(dx: number, dy: number) {
    this.lookDx += dx;
    this.lookDy += dy;
  }

  walkTo(x: number, z: number) {
    this.target = { x, z };
  }

  step(forward: number) {
    this.pose.x += -Math.sin(this.pose.yaw) * forward * 0.5;
    this.pose.z += -Math.cos(this.pose.yaw) * forward * 0.5;
    this.clamp();
  }

  turn(dir: number) {
    this.pose.yaw += dir * (Math.PI / 8);
  }

  update(dt: number, camera: Camera, reducedMotion: boolean) {
    const p = this.pose;
    const k = this.keys;
    const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const strafe = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
    const turn = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0);

    p.yaw += turn * TURN_SPEED * dt - this.lookDx * 0.004;
    p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch - this.lookDy * 0.004));
    this.lookDx = 0;
    this.lookDy = 0;

    const sin = Math.sin(p.yaw);
    const cos = Math.cos(p.yaw);
    p.x += (-sin * fwd + cos * strafe) * WALK_SPEED * dt;
    p.z += (-cos * fwd - sin * strafe) * WALK_SPEED * dt;

    if (this.target) {
      const dx = this.target.x - p.x;
      const dz = this.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = WALK_SPEED * 1.5 * dt;
      if (reducedMotion || dist <= stepLen) {
        p.x = this.target.x;
        p.z = this.target.z;
        this.target = null;
      } else {
        p.x += (dx / dist) * stepLen;
        p.z += (dz / dist) * stepLen;
      }
    }

    this.clamp();
    camera.position.set(p.x, EYE, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
  }

  private clamp() {
    this.pose.x = Math.min(this.width - MARGIN, Math.max(MARGIN, this.pose.x));
    this.pose.z = Math.min(this.depth - MARGIN, Math.max(MARGIN, this.pose.z));
  }
}
