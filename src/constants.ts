/** Unicorn body width — the lane-sizing unit. 1 world unit = 1 meter. */
export const UNICORN_W = 1;
export const LANE_W = UNICORN_W * 1.1;
export const ROAD_W = LANE_W * 3;
export const BAND_W = ROAD_W / 7;

export const RAINBOW = [0xe40404, 0xff8200, 0xf1e300, 0x08ba00, 0x0030e2, 0x6c00ef, 0xa656ff];

export const SPEED_START = 7;
export const SPEED_CAP = 18;
export const SPEED_RAMP = 0.04;

/** Circular-arc path: start gentle, tighten with distance. */
export const ARC_R0 = 50;
export const ARC_R_MIN = 18;
export const ARC_TIGHTEN = 0.032;

export const GRAVITY = 38;
/** Starting feel knobs — DEV F3 tuner mutates the `let`s. */
export const JUMP_VEL0 = 11;
export const COYOTE0 = 0.08;
export const JUMP_BUF0 = 0.12;
export const SLIDE_TIME0 = 0.55;
export let JUMP_VEL = JUMP_VEL0;
export let COYOTE = COYOTE0;
export let JUMP_BUF = JUMP_BUF0;
export let SLIDE_TIME = SLIDE_TIME0;
export const LANE_SNAP = 14;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function setFeel(next: {
  coyote?: number;
  jumpBuf?: number;
  slide?: number;
  jumpVel?: number;
}): void {
  if (next.coyote != null) {
    COYOTE = clamp(next.coyote, 0, 0.35);
  }
  if (next.jumpBuf != null) {
    JUMP_BUF = clamp(next.jumpBuf, 0, 0.4);
  }
  if (next.slide != null) {
    SLIDE_TIME = clamp(next.slide, 0.12, 1.6);
  }
  if (next.jumpVel != null) {
    JUMP_VEL = clamp(next.jumpVel, 6, 18);
  }
}

export function resetFeel(): void {
  JUMP_VEL = JUMP_VEL0;
  COYOTE = COYOTE0;
  JUMP_BUF = JUMP_BUF0;
  SLIDE_TIME = SLIDE_TIME0;
}

export const IFRAMES = 2;
export const LIVES = 3;
export const FALL_TIME = 1.15;
export const DEATH_HOLD = 0.52;

export const CAM_FOV = 1.05;
export const CAM_BACK = 7.2;
export const CAM_HEIGHT = 3.4;
export const CAM_LOOK = 9;
export const CAM_LOOK_Y = 0.7;

export const SKY_R = 0.14;
export const SKY_G = 0.1;
export const SKY_B = 0.22;

export const HIT_W = 0.55;
export const HIT_LEN = 0.7;
export const HIT_H = 0.85;
export const HIT_H_SLIDE = 0.3;

export const FONT = 'Segoe UI, system-ui, sans-serif';
