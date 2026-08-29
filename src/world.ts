import { HIT_LEN, LANE_W, RAINBOW } from './constants';
import { drawBox, drawOct } from './gl';
import { rgb } from './math';
import { playCrystal } from './music';
import { resetPath, worldPos, yawAt } from './path';
import { addCrystals, dying, hit, hitboxH, iframes, lane, laneX, offTrack, s, y } from './player';
import { crystalValue, magnetReach } from './save';

export const OBS_LOW = 0;
export const OBS_HIGH = 1;
export const OBS_WALL = 2;

type Obstacle = { s: number; lane: number; kind: number };
type Crystal = { s: number; x: number; y: number; dead: number };
type Burst = {
  s: number;
  x: number;
  y: number;
  vs: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
  g: number;
  b: number;
  size: number;
};

const obstacles: Obstacle[] = [];
const crystals: Crystal[] = [];
const bursts: Burst[] = [];
const wp = [0, 0, 0];

let nextS = 28;

export function burstCount(): number {
  return bursts.length;
}

export function resetWorld(): void {
  obstacles.length = 0;
  crystals.length = 0;
  bursts.length = 0;
  nextS = 28;
  resetPath();
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
    if (kind === OBS_LOW && blocked) {
      addLine(at, lane, 5, 4.2, 0.5, 1.15);
    } else if (kind === OBS_HIGH && blocked) {
      addLine(at, lane, 5, 3.6, 0.5, -0.28);
    } else if (!blocked && rand() < 0.55) {
      addLine(at + 2.2, lane, 3, 2.2, 0.55, 0);
    }
  }
}

function addLine(
  at: number,
  lane: number,
  n: number,
  span: number,
  midY: number,
  amp: number
): void {
  const x = lane * LANE_W;
  for (let i = 0; i < n; i++) {
    const t = n < 2 ? 0.5 : i / (n - 1);
    crystals.push({
      s: at + (t - 0.5) * span,
      x,
      y: midY + Math.sin(t * Math.PI) * amp,
      dead: 0,
    });
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
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.s += b.vs * dt;
    b.x += b.vx * dt;
    b.vy -= 22 * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.s < s - 12) {
      bursts.splice(i, 1);
    }
  }

  collide();
  magnet(dt);
}

function explode(o: Obstacle): void {
  const x = o.lane * LANE_W;
  const y0 = o.kind === OBS_LOW ? 0.25 : o.kind === OBS_HIGH ? 0.55 : 0.5;
  for (let i = 0; i < 12; i++) {
    const col = rgb(RAINBOW[i % 7]);
    bursts.push({
      s: o.s,
      x: x + (rand() - 0.5) * 0.35,
      y: y0 + rand() * 0.25,
      vs: (rand() - 0.5) * 8,
      vx: (rand() - 0.5) * 7,
      vy: 5 + rand() * 8,
      life: 0.45 + rand() * 0.35,
      r: col[0],
      g: col[1],
      b: col[2],
      size: 0.1 + rand() * 0.14,
    });
  }
}

function collide(): void {
  if (iframes > 0 || dying > 0) {
    return;
  }
  const feet = y;
  const head = y + hitboxH();
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
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
      explode(o);
      obstacles.splice(i, 1);
      hit(false);
      return;
    }
  }
}

function magnet(dt: number): void {
  if (offTrack()) {
    return;
  }
  const reach = magnetReach();
  const value = crystalValue();
  const span = reach === 1 ? 0 : reach === 2 ? 1 : reach === 3 ? 2 : -1;
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
    if (span < 0) {
      continue;
    }
    const cLane = Math.round(c.x / LANE_W);
    if (Math.abs(cLane - lane) > span) {
      continue;
    }
    if (Math.hypot(dx, ds) < 1.1) {
      c.dead = 1;
      addCrystals(value);
      playCrystal();
      continue;
    }
    if (Math.abs(ds) > 4.5) {
      continue;
    }
    const k = Math.min(1, 10 * dt);
    c.x -= dx * k;
    c.s -= ds * k;
    c.y -= dy * k;
  }
}

export function drawWorld(view: Float32Array): void {
  for (const o of obstacles) {
    const yaw = yawAt(o.s);
    const x = o.lane * LANE_W;
    if (o.kind === OBS_LOW) {
      worldPos(o.s, x, 0.2, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.9, 0.4, 0.45, 0.18, 0.16, 0.22);
    } else if (o.kind === OBS_HIGH) {
      const hw = LANE_W * 0.42;
      worldPos(o.s, x - hw, 0.36, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      worldPos(o.s, x + hw, 0.36, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      worldPos(o.s, x, 0.72, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.92, 0.16, 0.16, 0.2, 0.18, 0.26);
    } else {
      worldPos(o.s, x, 0.55, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.85, 1.1, 0.4, 0.28, 0.12, 0.16);
    }
  }
  const spin = s * 2;
  for (const c of crystals) {
    if (c.dead) {
      continue;
    }
    worldPos(c.s, c.x, c.y, wp);
    drawOct(view, wp[0], wp[1], wp[2], 0.4, spin, 0.38, 0.55, 0.38, 0.45, 0.95, 1);
  }
  for (const b of bursts) {
    const k = Math.max(0.15, b.life * 1.6);
    worldPos(b.s, b.x, b.y, wp);
    drawBox(
      view,
      wp[0],
      wp[1],
      wp[2],
      b.life * 8,
      yawAt(b.s),
      b.size * k,
      b.size * k,
      b.size * k,
      b.r,
      b.g,
      b.b
    );
  }
}
