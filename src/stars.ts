import { drawBox, setDepthWrite, setDrawAlpha } from './gl';
import { worldPos, yawAt } from './path';
import { charge } from './player';

type Star = { s: number; x: number; y: number; size: number };

const stars: Star[] = [];
const wp = [0, 0, 0];

function scatter(st: Star, camS: number, y: number): void {
  st.s = camS + Math.random() * 104 - 22;
  st.x = (Math.random() - 0.5) * 100;
  st.y = y;
  st.size = 0.04 + Math.random() * 0.08;
  if (Math.abs(st.x) < 5 && st.y > -1 && st.y < 5) {
    st.x += st.x < 0 ? -10 : 10;
  }
}

function seed(camS: number): void {
  if (stars.length) {
    return;
  }
  for (let i = 0; i < 90; i++) {
    const st = { s: 0, x: 0, y: 0, size: 0 };
    scatter(st, camS, -14 + Math.random() * 38);
    stars.push(st);
  }
}

export function updateStars(dt: number, camS: number): void {
  seed(camS);
  const up = charge > 0 ? 0.18 : 0.52;
  for (const st of stars) {
    st.y += up * dt;
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

export function drawStars(view: Float32Array): void {
  if (!stars.length) {
    return;
  }
  const warp = charge > 0;
  setDepthWrite(false);
  setDrawAlpha(warp ? 0.9 : 0.72);
  for (const st of stars) {
    worldPos(st.s, st.x, st.y, wp);
    const t = st.size;
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
