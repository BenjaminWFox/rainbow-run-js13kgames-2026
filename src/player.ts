import {
  COYOTE,
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

export function addCrystals(n: number): void {
  runCrystals += n;
}

let coyote = 0;
let jumpBuf = 0;
let splay = 0;

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
  splay = 0;
}

export function hitboxH(): number {
  return slide > 0 ? HIT_H_SLIDE : HIT_H;
}

export function poseSplay(): number {
  return splay;
}

export function tryLane(dir: number): void {
  const next = lane + dir;
  if (next < -1 || next > 1) {
    if (iframes <= 0) {
      hit(true);
    }
    return;
  }
  lane = next;
}

export function tryJump(): void {
  jumpBuf = JUMP_BUF;
}

export function trySlide(): void {
  if (y <= 0.02) {
    if (slide <= 0) {
      playNova();
    }
    slide = SLIDE_TIME;
  }
}

export function hit(fell: boolean): void {
  if (iframes > 0) {
    return;
  }
  lives--;
  iframes = IFRAMES;
  playHit();
  if (fell) {
    lane = 0;
  }
}

export function updatePlayer(dt: number): void {
  speed = Math.min(
    SPEED_CAP + startSpeedBonus() * 0.4,
    SPEED_START + startSpeedBonus() + s * SPEED_RAMP
  );
  s += speed * dt;

  const target = lane * LANE_W;
  laneX += (target - laneX) * Math.min(1, LANE_SNAP * dt);

  if (y <= 0) {
    coyote = COYOTE;
  } else {
    coyote -= dt;
  }
  jumpBuf -= dt;

  if (jumpBuf > 0 && coyote > 0) {
    y = 0.01;
    vy = JUMP_VEL * jumpBonus();
    coyote = 0;
    jumpBuf = 0;
    slide = 0;
    playHorn();
  }

  if (y > 0 || vy > 0) {
    vy -= GRAVITY * dt;
    y += vy * dt;
    if (y <= 0) {
      y = 0;
      vy = 0;
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

  const want = slide > 0 || y > 0.08 ? 1 : 0;
  splay += (want - splay) * Math.min(1, 12 * dt);
}
