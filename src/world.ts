import { HIT_H, HIT_H_SLIDE, HIT_LEN, LANE_W, RAINBOW } from './constants';
import { drawBox, drawOct, setDepthWrite, setDrawAlpha } from './gl';
import { rgb } from './math';
import { playCrystal, playPowerup } from './music';
import { resetPath, worldPos, yawAt } from './path';
import {
  addCrystals,
  addLife,
  charge,
  chargeLockS,
  dying,
  grantCharge,
  grantShield,
  grantWings,
  hit,
  iframes,
  lane,
  laneX,
  lives,
  maxLives,
  offTrack,
  s,
  slide,
  speed,
  y,
} from './player';
import { chargeRank, healthRank, magnetReach, shieldRank, wingsRank } from './save';
import { beginShadows, endShadows, stampShadow } from './shadow';

const OBS_LOW = 0;
const OBS_HIGH = 1;
const OBS_WALL = 2;
const OBS_TOWER = 3;
const OBS_GATE = 4;
const GATE_TOP = 1.7;
const TOWER_TOP = 1.9;

const DROP_SHIELD = 0;
const DROP_HEART = 1;
const DROP_WINGS = 2;
const DROP_CHARGE = 3;

type Obstacle = { s: number; lane: number; kind: number };
type Crystal = { s: number; x: number; y: number; dead: number };
type Drop = { s: number; x: number; y: number; kind: number; dead: number };
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
const drops: Drop[] = [];
const bursts: Burst[] = [];
const wp = [0, 0, 0];
let trailAcc = 0;

let nextS = 28;
/** Still overlapping after iframes — pass through, don't break or hit. */
let pass = false;

export function resetWorld(): void {
  obstacles.length = 0;
  crystals.length = 0;
  drops.length = 0;
  bursts.length = 0;
  trailAcc = 0;
  nextS = 28;
  pass = false;
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
  let kind = OBS_TOWER;
  if (roll < 0.26) {
    kind = OBS_LOW;
  } else if (roll < 0.52) {
    kind = OBS_HIGH;
  } else if (roll < 0.74) {
    kind = OBS_WALL;
  } else if (roll < 0.87) {
    kind = OBS_GATE;
  }
  const solid = kind === OBS_WALL || kind === OBS_TOWER;
  let mask = 0;
  if (solid) {
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
  const duck = kind === OBS_HIGH || kind === OBS_GATE;
  for (let lane = -1; lane <= 1; lane++) {
    const blocked = !!(mask & (1 << (lane + 1)));
    if (kind === OBS_LOW && blocked) {
      addLine(at, lane, 5, 4.2, 0.5, 1.15);
    } else if (duck && blocked) {
      addLine(at, lane, 5, 3.6, 0.5, -0.28);
    } else if (!blocked && rand() < 0.55) {
      addLine(at + 2.2, lane, 3, 2.2, 0.55, 0);
    }
  }
  spawnDrop(at, mask);
}

function spawnDrop(at: number, mask: number): void {
  if (charge > 0) {
    return;
  }
  const open: number[] = [];
  for (let lane = -1; lane <= 1; lane++) {
    if (!(mask & (1 << (lane + 1)))) {
      open.push(lane);
    }
  }
  if (!open.length) {
    open.push(0);
  }
  const pool: number[] = [];
  if (shieldRank()) {
    pool.push(DROP_SHIELD);
  }
  if (healthRank()) {
    pool.push(DROP_HEART);
  }
  if (wingsRank()) {
    pool.push(DROP_WINGS);
  }
  if (chargeRank() && at >= chargeLockS) {
    pool.push(DROP_CHARGE);
  }
  if (!pool.length) {
    return;
  }
  const kind = pool[(rand() * pool.length) | 0];
  const rank =
    kind === DROP_SHIELD
      ? shieldRank()
      : kind === DROP_HEART
        ? healthRank()
        : kind === DROP_WINGS
          ? wingsRank()
          : chargeRank();
  if (rand() > 0.06 + 0.05 * rank) {
    return;
  }
  if (kind === DROP_HEART && rand() < 0.5) {
    return;
  }
  const lane = open[(rand() * open.length) | 0];
  drops.push({ s: at + 4, x: lane * LANE_W, y: 0.7, kind, dead: 0 });
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
  const ahead = Math.max(70, speed * 2.8);
  while (nextS < s + ahead) {
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
  for (let i = drops.length - 1; i >= 0; i--) {
    if (drops[i].dead || drops[i].s < s - 12) {
      drops.splice(i, 1);
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
  collectDrops();
  if (charge > 0) {
    trailCharge(dt);
  }
}

function collectDrops(): void {
  if (offTrack()) {
    return;
  }
  for (const d of drops) {
    if (d.dead) {
      continue;
    }
    if (Math.hypot(d.x - laneX, d.s - s, d.y - (y + 0.5)) > (charge > 0 ? 2.4 : 0.95)) {
      continue;
    }
    if (d.kind === DROP_HEART && lives >= maxLives()) {
      continue;
    }
    d.dead = 1;
    playPowerup();
    if (d.kind === DROP_SHIELD) {
      grantShield();
    } else if (d.kind === DROP_HEART) {
      addLife();
    } else if (d.kind === DROP_WINGS) {
      grantWings();
    } else {
      grantCharge();
      for (const extra of drops) {
        extra.dead = 1;
      }
    }
  }
}

/** r < 0: rainbow palette. Else a single RGB color. */
function burst(
  s0: number,
  x0: number,
  y0: number,
  n: number,
  r: number,
  g: number,
  b: number,
  scale: number
): void {
  for (let i = 0; i < n; i++) {
    const col = r < 0 ? rgb(RAINBOW[i % 7]) : [r, g, b];
    bursts.push({
      s: s0,
      x: x0 + (rand() - 0.5) * 0.35,
      y: y0 + rand() * 0.25,
      vs: (rand() - 0.5) * 8,
      vx: (rand() - 0.5) * 7,
      vy: 5 + rand() * 8,
      life: 0.45 + rand() * 0.35,
      r: col[0],
      g: col[1],
      b: col[2],
      size: (0.1 + rand() * 0.14) * scale,
    });
  }
}

function explode(o: Obstacle): void {
  const x = o.lane * LANE_W;
  let y0 = 0.5;
  let r = 0.28;
  let g = 0.12;
  let b = 0.16;
  if (o.kind === OBS_LOW) {
    y0 = 0.25;
    r = 0.18;
    g = 0.16;
    b = 0.22;
  } else if (o.kind === OBS_HIGH) {
    y0 = 0.55;
    r = 0.2;
    g = 0.18;
    b = 0.26;
  } else if (o.kind === OBS_GATE || o.kind === OBS_TOWER) {
    y0 = 0.7;
    r = 0.3;
    g = 0.1;
    b = 0.14;
  }
  burst(o.s, x, y0, 12, r, g, b, 1);
}

function takeCrystal(c: Crystal): void {
  c.dead = 1;
  addCrystals(1);
  playCrystal();
  burst(c.s, c.x, c.y, 8, -1, 0, 0, 0.5);
}

function overlapAt(): number {
  const feet = y;
  const head = y + (slide > 0 ? HIT_H_SLIDE : HIT_H);
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
    } else if (o.kind === OBS_GATE) {
      y0 = 0.4;
      y1 = GATE_TOP;
    } else if (o.kind === OBS_TOWER) {
      y1 = TOWER_TOP;
    }
    if (head > y0 && feet < y1) {
      return i;
    }
  }
  return -1;
}

function smashCharge(): void {
  const back = s - speed * 0.05 - HIT_LEN;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (o.s < back || o.s > s + HIT_LEN) {
      continue;
    }
    if (Math.abs(o.lane * LANE_W - laneX) > LANE_W * 0.5) {
      continue;
    }
    explode(o);
    obstacles.splice(i, 1);
  }
}

function trailCharge(dt: number): void {
  trailAcc += speed * dt;
  while (trailAcc > 0.45) {
    trailAcc -= 0.45;
    burst(s - 1.05, laneX + (rand() - 0.5) * 0.25, y + 0.28 + rand() * 0.2, 2, -1, 0, 0, 0.5);
  }
}

function collide(): void {
  if (dying > 0) {
    return;
  }
  if (charge > 0) {
    smashCharge();
    return;
  }
  const i = overlapAt();
  if (iframes > 0 || offTrack()) {
    pass = i >= 0;
    return;
  }
  if (pass) {
    if (i >= 0) {
      return;
    }
    pass = false;
  }
  if (i < 0) {
    return;
  }
  explode(obstacles[i]);
  obstacles.splice(i, 1);
  hit(false);
  pass = true;
}

function magnet(dt: number): void {
  if (offTrack()) {
    return;
  }
  const reach = magnetReach();
  const span = reach - 1;
  const catchR = 1.15 + speed * 0.1;
  const aimS = s + speed * 0.12;
  for (const c of crystals) {
    if (c.dead) {
      continue;
    }
    const dx = c.x - laneX;
    const ds = c.s - s;
    const dy = c.y - (y + 0.5);
    if (Math.hypot(dx, ds, dy) < (charge > 0 ? 2.2 : 0.85)) {
      takeCrystal(c);
      continue;
    }
    if (span < 0) {
      continue;
    }
    const cLane = Math.round(c.x / LANE_W);
    if (Math.abs(cLane - lane) > span) {
      continue;
    }
    if (Math.hypot(dx, ds) < catchR) {
      takeCrystal(c);
      continue;
    }
    if (Math.abs(ds) > 4.5) {
      continue;
    }
    const k = Math.min(1, 12 * dt);
    c.x -= dx * k;
    c.s -= (c.s - aimS) * k;
    c.y -= dy * k;
  }
}

function stampObstacle(view: Float32Array, o: Obstacle): void {
  const yaw = yawAt(o.s);
  const x = o.lane * LANE_W;
  if (o.kind === OBS_LOW) {
    stampShadow(view, o.s, x, 0, 0.2, 0, yaw, LANE_W * 0.9, 0.45);
  } else if (o.kind === OBS_HIGH || o.kind === OBS_GATE) {
    const hw = LANE_W * 0.42;
    stampShadow(view, o.s, x, -hw, 0.36, 0, yaw, 0.12, 0.12);
    stampShadow(view, o.s, x, hw, 0.36, 0, yaw, 0.12, 0.12);
    stampShadow(view, o.s, x, 0, 0.72, 0, yaw, LANE_W * 0.92, 0.16);
    if (o.kind === OBS_GATE) {
      stampShadow(view, o.s, x, 0, 1.25, 0, yaw, LANE_W * 0.85, 0.4);
    }
  } else if (o.kind === OBS_TOWER) {
    stampShadow(view, o.s, x, 0, 0.95, 0, yaw, LANE_W * 0.85, 0.4);
  } else {
    stampShadow(view, o.s, x, 0, 0.55, 0, yaw, LANE_W * 0.85, 0.4);
  }
}

export function drawWorld(view: Float32Array): void {
  beginShadows();
  for (const o of obstacles) {
    stampObstacle(view, o);
  }
  for (const c of crystals) {
    if (!c.dead) {
      stampShadow(view, c.s, c.x, 0, c.y, 0, yawAt(c.s), 0.36, 0.36, true);
    }
  }
  endShadows();
  for (const o of obstacles) {
    const yaw = yawAt(o.s);
    const x = o.lane * LANE_W;
    if (o.kind === OBS_LOW) {
      worldPos(o.s, x, 0.2, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.9, 0.4, 0.45, 0.18, 0.16, 0.22);
    } else if (o.kind === OBS_HIGH || o.kind === OBS_GATE) {
      const hw = LANE_W * 0.42;
      worldPos(o.s, x - hw, 0.36, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      worldPos(o.s, x + hw, 0.36, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, 0.12, 0.72, 0.12, 0.16, 0.14, 0.22);
      worldPos(o.s, x, 0.72, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.92, 0.16, 0.16, 0.2, 0.18, 0.26);
      if (o.kind === OBS_GATE) {
        worldPos(o.s, x, 1.25, wp);
        drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.85, 0.89, 0.4, 0.3, 0.1, 0.14);
      }
    } else if (o.kind === OBS_TOWER) {
      worldPos(o.s, x, 0.95, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.85, 1.9, 0.4, 0.3, 0.1, 0.14);
    } else {
      worldPos(o.s, x, 0.55, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0, yaw, LANE_W * 0.85, 1.1, 0.4, 0.28, 0.12, 0.16);
    }
  }
  const spin = s * 2;
  for (const d of drops) {
    if (d.dead) {
      continue;
    }
    const yaw = yawAt(d.s);
    let br = 1;
    let bg = 0.82;
    let bb = 0.2;
    if (d.kind === DROP_SHIELD) {
      worldPos(d.s, d.x, d.y, wp);
      drawOct(view, wp[0], wp[1], wp[2], 0.5, spin, 0.42, 0.42, 0.42, 1, 0.82, 0.2);
    } else if (d.kind === DROP_CHARGE) {
      const col = rgb(RAINBOW[((s * 1.5) | 0) % 7]);
      br = col[0];
      bg = col[1];
      bb = col[2];
      worldPos(d.s, d.x, d.y, wp);
      drawOct(view, wp[0], wp[1], wp[2], 0.7, spin, 0.3, 0.52, 0.3, br, bg, bb);
    } else if (d.kind === DROP_HEART) {
      br = 1;
      bg = 0.35;
      bb = 0.45;
      worldPos(d.s, d.x, d.y, wp);
      drawOct(view, wp[0], wp[1], wp[2], 0.2, spin, 0.36, 0.32, 0.36, br, bg, bb);
    } else {
      br = 0.72;
      bg = 0.74;
      bb = 0.8;
      worldPos(d.s, d.x - 0.22, d.y, wp);
      drawBox(view, wp[0], wp[1], wp[2], 0.5, yaw, 0.14, 0.1, 0.42, 0.62, 0.64, 0.7);
      worldPos(d.s, d.x + 0.22, d.y, wp);
      drawBox(view, wp[0], wp[1], wp[2], -0.5, yaw, 0.14, 0.1, 0.42, 0.62, 0.64, 0.7);
      worldPos(d.s, d.x, d.y, wp);
    }
    setDepthWrite(false);
    setDrawAlpha(0.2);
    drawOct(view, wp[0], wp[1], wp[2], 0, spin * 0.4, 0.82, 0.82, 0.82, br, bg, bb);
    setDrawAlpha(1);
    setDepthWrite(true);
  }
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
