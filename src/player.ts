import {
  COYOTE,
  DEATH_HOLD,
  FALL_TIME,
  GRAVITY,
  HIT_H,
  HIT_H_SLIDE,
  IFRAMES,
  JUMP_BUF,
  JUMP_VEL,
  LANE_SNAP,
  LANE_W,
  LIVES,
  SLIDE_TIME,
  SPEED_CAP,
  SPEED_RAMP,
  SPEED_START,
} from './constants';
import { playHit, playHorn, playNova } from './music';
import { jumpBonus, startSpeedBonus } from './save';

export let s = 0;
export let lane = 0;
export let laneX = 0;
export let y = 0;
export let vy = 0;
export let slide = 0;
export let lives = LIVES;
export let iframes = 0;
export let runCrystals = 0;
export let speed = SPEED_START;
export let dying = 0;
export let falling = 0;

export function addCrystals(n: number): void {
  runCrystals += n;
}

let coyote = 0;
let jumpBuf = 0;
let slideBuf = 0;
let splay = 0;
let dropJump = 0;
let fallDir = 0;
let fallX = 0;
let fallY = 0;

export function visLaneX(): number {
  return laneX + fallX;
}

export function visY(): number {
  return y - fallY;
}

export function inputLocked(): boolean {
  return falling > 0 || dying > 0;
}

export function resetPlayer(): void {
  s = 0;
  lane = 0;
  laneX = 0;
  y = 0;
  vy = 0;
  slide = 0;
  lives = LIVES;
  iframes = 0;
  runCrystals = 0;
  speed = SPEED_START + startSpeedBonus();
  coyote = 0;
  jumpBuf = 0;
  slideBuf = 0;
  splay = 0;
  dropJump = 0;
  dying = 0;
  falling = 0;
  fallDir = 0;
  fallX = 0;
  fallY = 0;
}

export function hitboxH(): number {
  return slide > 0 ? HIT_H_SLIDE : HIT_H;
}

export function poseSplay(): number {
  return splay;
}

/** Remaining coyote / jump-buffer / slide windows, for the DEV tuner. */
export function feelLive(): { coyote: number; jumpBuf: number; slideBuf: number; slide: number } {
  return { coyote, jumpBuf, slideBuf, slide };
}

export function tryLane(dir: number): void {
  if (inputLocked()) {
    return;
  }
  const next = lane + dir;
  if (next < -1 || next > 1) {
    if (iframes <= 0) {
      fallDir = dir;
      hit(true);
    }
    return;
  }
  lane = next;
}

export function tryJump(): void {
  if (inputLocked()) {
    return;
  }
  if (slide > 0) {
    slide = 0;
    return;
  }
  slideBuf = 0;
  jumpBuf = JUMP_BUF;
}

export function trySlide(): void {
  if (inputLocked()) {
    return;
  }
  jumpBuf = 0;
  if (y > 0.02 || vy > 0) {
    if (dropJump) {
      slideBuf = JUMP_BUF;
    } else {
      slideBuf = 0;
      dropJump = 1;
    }
    if (vy > -12) {
      vy = -12;
    }
    return;
  }
  if (slide <= 0) {
    playNova();
  }
  slide = SLIDE_TIME;
}

export function hit(fell: boolean): void {
  if (iframes > 0 || dying > 0) {
    return;
  }
  lives--;
  playHit();
  if (fell) {
    falling = FALL_TIME;
  }
  if (lives <= 0) {
    dying = DEATH_HOLD;
    iframes = 0;
  } else {
    iframes = IFRAMES;
  }
}

export function updatePlayer(dt: number): void {
  speed = Math.min(
    SPEED_CAP + startSpeedBonus() * 0.4,
    SPEED_START + startSpeedBonus() + s * SPEED_RAMP
  );
  s += speed * dt;

  if (falling > 0 || (dying > 0 && fallY > 0)) {
    fallX += fallDir * 8 * dt;
    fallY += (14 + fallY * 3.2) * dt;
  }
  if (falling > 0) {
    falling -= dt;
    if (falling <= 0) {
      falling = 0;
      if (dying <= 0) {
        fallX = 0;
        fallY = 0;
        lane = 0;
        laneX = 0;
        y = 0;
        vy = 0;
      }
    }
  }

  if (dying > 0) {
    dying -= dt;
  }

  if (inputLocked()) {
    jumpBuf = 0;
    slideBuf = 0;
    if (iframes > 0) {
      iframes -= dt;
    }
    return;
  }

  const target = lane * LANE_W;
  laneX += (target - laneX) * Math.min(1, LANE_SNAP * dt);

  if (y <= 0) {
    coyote = COYOTE;
  } else {
    coyote -= dt;
  }
  jumpBuf -= dt;
  if (y <= 0) {
    slideBuf -= dt;
  }

  if (jumpBuf > 0 && coyote > 0) {
    y = 0.01;
    vy = JUMP_VEL * jumpBonus();
    coyote = 0;
    jumpBuf = 0;
    slideBuf = 0;
    slide = 0;
    playHorn();
  } else if (slideBuf > 0 && coyote > 0) {
    if (slide <= 0) {
      playNova();
    }
    slide = SLIDE_TIME;
    slideBuf = 0;
  }

  if (y > 0 || vy > 0) {
    vy -= GRAVITY * dt;
    y += vy * dt;
    if (y <= 0) {
      y = 0;
      vy = 0;
      dropJump = 0;
      if (slideBuf > 0) {
        if (slide <= 0) {
          playNova();
        }
        slide = SLIDE_TIME;
        slideBuf = 0;
      }
    }
  }

  if (slide > 0) {
    slide -= dt;
    if (slide < 0) {
      slide = 0;
    }
  }

  if (iframes > 0) {
    iframes -= dt;
  }

  const want = slide > 0 || slideBuf > 0 || (y > 0.08 && !dropJump) ? 1 : 0;
  splay += (want - splay) * Math.min(1, (dropJump ? 16 : 12) * dt);
}
