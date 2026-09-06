import { drawBox, drawOct, setDepthWrite, setDrawAlpha } from './gl';
import { worldPos, yawAt } from './path';
import { charge } from './player';

type Star = { s: number; x: number; y: number; size: number; seed: number };

const stars: Star[] = [];
const wp = [0, 0, 0];

function isCloud(st: Star): boolean {
  return st.size > 0.5;
}

function scatter(st: Star, camS: number, y: number): void {
  const cloud = isCloud(st);
  st.s = camS + Math.random() * 104 - 22;
  st.x = cloud
    ? (22 + Math.random() * 24) * (Math.random() < 0.5 ? -1 : 1)
    : (Math.random() - 0.5) * 100;
  st.y = y;
  st.size = cloud ? 0.85 + Math.random() * 2.8 : 0.04 + Math.random() * 0.08;
  st.seed = Math.random();
  if (!cloud && Math.abs(st.x) < 5 && st.y > -1 && st.y < 5) {
    st.x += st.x < 0 ? -10 : 10;
  }
}

function seed(camS: number): void {
  if (stars.length) {
    return;
  }
  for (let i = 0; i < 90; i++) {
    const st = { s: 0, x: 0, y: 0, size: 0, seed: 0 };
    scatter(st, camS, -14 + Math.random() * 38);
    stars.push(st);
  }
  for (let i = 0; i < 9; i++) {
    const st = { s: 0, x: 0, y: 0, size: 2, seed: 0 };
    scatter(st, camS, -4 + Math.random() * 20);
    stars.push(st);
  }
}

export function updateStars(dt: number, camS: number): void {
  seed(camS);
  const up = charge > 0 ? 0.18 : 0.52;
  for (const st of stars) {
    st.y += (isCloud(st) ? up * 0.28 : up) * dt;
    if (st.y > 24) {
      scatter(st, camS, -14);
    }
    const ds = st.s - camS;
    if (ds < -22) {
      st.s += 104;
    } else if (ds > 82) {
      st.s -= 104;
    }
  }
}

function puff(
  view: Float32Array,
  s: number,
  x: number,
  y: number,
  yaw: number,
  sx: number,
  sy: number,
  sz: number
): void {
  worldPos(s, x, y, wp);
  drawOct(view, wp[0], wp[1], wp[2], 0, yaw, sx, sy, sz, 0.96, 0.96, 1);
}

export function drawStars(view: Float32Array): void {
  if (!stars.length) {
    return;
  }
  const warp = charge > 0;
  setDepthWrite(false);
  for (const st of stars) {
    const t = st.size;
    if (isCloud(st)) {
      setDrawAlpha(warp ? 0.14 : 0.28);
      const yaw = yawAt(st.s);
      const n = 2 + ((st.seed * 4) | 0);
      for (let i = 0; i < n; i++) {
        const u = (st.seed * 9 + i * 1.7) % 1;
        const v = (st.seed * 5 + i * 2.3) % 1;
        const sc = 0.62 + ((st.seed * 7 + i * 1.1) % 1) * 0.5;
        puff(
          view,
          st.s,
          st.x + (u - 0.5) * t * 0.7,
          st.y + (v - 0.4) * t * 0.26,
          yaw,
          t * sc,
          t * sc * 0.48,
          t * sc * 0.62
        );
      }
      continue;
    }
    worldPos(st.s, st.x, st.y, wp);
    setDrawAlpha(warp ? 0.9 : 0.72);
    drawBox(
      view,
      wp[0],
      wp[1],
      wp[2],
      0,
      yawAt(st.s),
      warp ? t * 0.4 : t,
      warp ? t * 0.4 : t,
      warp ? 5.4 : t,
      0.92,
      0.94,
      1
    );
  }
  setDrawAlpha(1);
  setDepthWrite(true);
}
