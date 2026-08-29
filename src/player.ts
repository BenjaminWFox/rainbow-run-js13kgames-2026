import {
  COYOTE,
  DEATH_HOLD,
  FALL_TIME,
  GRAVITY,
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
  SWOOP_TIME,
} from './constants';
import { playFall, playHit, playJump, playLane, playSlide, playWingSave } from './music';
import { canCancelJump, canCancelSlide, healthRank, jumpBonus, startSpeedBonus } from './save';

export let s = 0;
export let lane = 0;
export let laneX = 0;
export let y = 0;
export let slide = 0;
export let lives = LIVES;
export let iframes = 0;
export let runCrystals = 0;
export let speed = SPEED_START;
export let dying = 0;
export let falling = 0;
export let swoop = 0;
export let shield = 0;
export let wings = 0;
export let splay = 0;

let vy = 0;

export function addCrystals(n: number): void {
  runCrystals += n;
}

let coyote = 0;
let jumpBuf = 0;
let slideBuf = 0;
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
  return falling > 0 || swoop > 0 || dying > 0;
}

export function offTrack(): boolean {
  return falling > 0 || swoop > 0 || fallY > 0;
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
  swoop = 0;
  fallDir = 0;
  fallX = 0;
  fallY = 0;
  shield = 0;
  wings = 0;
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
  playLane();
}

export function tryJump(): void {
  if (inputLocked()) {
    return;
  }
  if (slide > 0) {
    if (canCancelSlide()) {
      slide = 0;
    }
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
    if (!canCancelJump()) {
      return;
    }
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
    playSlide();
  }
  slide = SLIDE_TIME;
}

export function maxLives(): number {
  return LIVES + healthRank();
}

export function addLife(): void {
  if (lives < maxLives()) {
    lives++;
  }
}

export function grantShield(): void {
  shield = 1;
}

export function grantWings(): void {
  wings = 1;
}

export function hit(fell: boolean): void {
  if (iframes > 0 || dying > 0) {
    return;
  }
  if (fell && wings > 0) {
    wings = 0;
    swoop = SWOOP_TIME;
    iframes = SWOOP_TIME;
    playWingSave();
    return;
  }
  if (!fell && shield > 0) {
    shield = 0;
    iframes = IFRAMES;
    playHit();
    return;
  }
  lives--;
  if (fell) {
    playFall();
    falling = FALL_TIME;
  } else {
    playHit();
  }
  if (lives <= 0) {
    dying = DEATH_HOLD;
    iframes = 0;
  } else {
    iframes = IFRAMES;
  }
}

export function updatePlayer(dt: number): void {
  const boost = startSpeedBonus();
  speed = Math.min(SPEED_CAP + boost * 0.4, SPEED_START + boost + s * SPEED_RAMP);
  s += speed * dt;

  if (swoop > 0) {
    swoop -= dt;
    const p = 1 - Math.max(0, swoop) / SWOOP_TIME;
    fallX = Math.sin(p * Math.PI) * fallDir * 2.4;
    const dip = Math.sin(Math.min(1, p / 0.38) * Math.PI) * 1.05;
    const lift = p < 0.28 ? 0 : Math.sin(Math.min(1, (p - 0.28) / 0.72) * Math.PI) * 2.5;
    fallY = dip - lift;
    if (swoop <= 0) {
      swoop = 0;
      fallX = 0;
      fallY = 0;
      y = 0;
      vy = 0;
      iframes = IFRAMES;
    }
  } else if (falling > 0 || (dying > 0 && fallY > 0)) {
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
    playJump();
  } else if (slideBuf > 0 && coyote > 0) {
    if (slide <= 0) {
      playSlide();
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
          playSlide();
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
