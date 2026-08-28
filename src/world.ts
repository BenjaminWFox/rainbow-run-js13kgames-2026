import { HIT_LEN, LANE_W } from './constants';
import { drawBox, drawOct } from './gl';
import { playCrystal } from './music';
import { yawAt } from './path';
import { addCrystals, hit, hitboxH, iframes, laneX, s, y } from './player';
import { crystalValue, magnetRadius } from './save';

export const OBS_LOW = 0;
export const OBS_HIGH = 1;
export const OBS_WALL = 2;

type Obstacle = { s: number; lane: number; kind: number };
type Crystal = { s: number; x: number; y: number; dead: number };

const obstacles: Obstacle[] = [];
const crystals: Crystal[] = [];

let nextS = 28;

export function resetWorld(): void {
  obstacles.length = 0;
  crystals.length = 0;
  nextS = 28;
}

function rand(): number {
  return Math.random();
}

function countBits(n: number): number {
  return (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);
}

function spawnGroup(at: number): void {
  const roll = rand();
  let kind = OBS_WALL;
  if (roll < 0.34) {
    kind = OBS_LOW;
  } else if (roll < 0.68) {
    kind = OBS_HIGH;
  }
  let mask = 0;
  if (kind === OBS_WALL) {
    const n = rand() < 0.55 ? 1 : 2;
    while (countBits(mask) < n) {
      mask |= 1 << ((rand() * 3) | 0);
    }
  } else if (rand() < 0.35) {
    mask = 7;
  } else {
    mask = 1 << ((rand() * 3) | 0);
    if (rand() < 0.5) {
      mask |= 1 << ((rand() * 3) | 0);
    }
  }
  for (let lane = -1; lane <= 1; lane++) {
    if (mask & (1 << (lane + 1))) {
      obstacles.push({ s: at, lane, kind });
    }
  }
  for (let lane = -1; lane <= 1; lane++) {
    const blocked = !!(mask & (1 << (lane + 1)));
    if (kind === OBS_LOW && blocked && rand() < 0.7) {
      crystals.push({ s: at, x: lane * LANE_W, y: 1.35, dead: 0 });
    } else if (!blocked && rand() < 0.55) {
      crystals.push({ s: at + 2.2, x: lane * LANE_W, y: 0.55, dead: 0 });
    }
  }
}

export function updateWorld(dt: number): void {
  const density = Math.max(8, 15 - s * 0.012);
  while (nextS < s + 70) {
    spawnGroup(nextS);
    nextS += density + rand() * 5;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].s < s - 12) {
      obstacles.splice(i, 1);
    }
  }
  for (let i = crystals.length - 1; i >= 0; i--) {
    if (crystals[i].dead || crystals[i].s < s - 12) {
      crystals.splice(i, 1);
    }
  }

  collide();
  magnet(dt);
}

function collide(): void {
  if (iframes > 0) {
    return;
  }
  const feet = y;
  const head = y + hitboxH();
  for (const o of obstacles) {
    if (Math.abs(o.s - s) > HIT_LEN) {
      continue;
    }
    if (Math.abs(o.lane * LANE_W - laneX) > LANE_W * 0.42) {
      continue;
    }
    let y0 = 0;
    let y1 = 1.15;
    if (o.kind === OBS_LOW) {
      y1 = 0.42;
    } else if (o.kind === OBS_HIGH) {
      y0 = 0.4;
      y1 = 1.05;
    }
    if (head > y0 && feet < y1) {
      hit(false);
      return;
    }
  }
}

function magnet(dt: number): void {
  const mag = magnetRadius();
  const value = crystalValue();
  for (const c of crystals) {
    if (c.dead) {
      continue;
    }
    const dx = c.x - laneX;
    const ds = c.s - s;
    const dy = c.y - (y + 0.5);
    const dist = Math.hypot(dx, ds, dy);
    if (dist < 0.85) {
      c.dead = 1;
      addCrystals(value);
      playCrystal();
      continue;
    }
    if (mag && dist < mag) {
      const k = Math.min(1, 10 * dt);
      c.x -= dx * k;
      c.s -= ds * k;
      c.y -= dy * k;
    }
  }
}

export function drawWorld(view: Float32Array): void {
  const yaw = yawAt(s);
  for (const o of obstacles) {
    const x = o.lane * LANE_W;
    const z = o.s;
    if (o.kind === OBS_LOW) {
      drawBox(view, x, 0.2, z, 0, yaw, LANE_W * 0.9, 0.4, 0.45, 0.18, 0.16, 0.22);
    } else if (o.kind === OBS_HIGH) {
      const hw = LANE_W * 0.42;
      drawBox(view, x - hw, 0.36, z, 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      drawBox(view, x + hw, 0.36, z, 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      drawBox(view, x, 0.72, z, 0, yaw, LANE_W * 0.92, 0.16, 0.16, 0.2, 0.18, 0.26);
    } else {
      drawBox(view, x, 0.55, z, 0, yaw, LANE_W * 0.85, 1.1, 0.4, 0.28, 0.12, 0.16);
    }
  }
  const spin = s * 2;
  for (const c of crystals) {
    if (c.dead) {
      continue;
    }
    drawOct(view, c.x, c.y, c.s, 0.4, spin, 0.38, 0.55, 0.38, 0.45, 0.95, 1);
  }
}
