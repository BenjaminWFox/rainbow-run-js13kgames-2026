import { drawBox, drawOct, setDepthWrite, setDrawAlpha } from './gl';
import { pathFrame } from './path';

/** Path-local key light: overhead, a bit toward screen-right (−normal). */
const LIGHT_X = -1.35;
const LIGHT_Y = 6.5;
const GROUND = 0.03;

const pos = [0, 0, 0];
let baseA = 1;

export function beginShadows(fade = 1): void {
  baseA = setDrawAlpha(1);
  setDrawAlpha(baseA * 0.4 * fade);
  setDepthWrite(false);
}

export function endShadows(): void {
  setDrawAlpha(baseA);
  setDepthWrite(true);
}

export function stampShadow(
  view: Float32Array,
  s: number,
  baseX: number,
  lx: number,
  ly: number,
  lz: number,
  yaw: number,
  sx: number,
  sz: number,
  oct = false
): void {
  const py = ly < 0.12 ? 0.12 : ly;
  const t = (GROUND - LIGHT_Y) / (py - LIGHT_Y);
  const k = LIGHT_Y / (LIGHT_Y - py);
  pathFrame(s, baseX + LIGHT_X + t * (lx - LIGHT_X), GROUND, t * lz, pos);
  const x = pos[0];
  const y = pos[1];
  const z = pos[2];
  const w = sx * k;
  const d = sz * k;
  if (oct) {
    drawOct(view, x, y, z, 0, yaw, w, 0.03, d, 0.07, 0.04, 0.1);
  } else {
    drawBox(view, x, y, z, 0, yaw, w, 0.03, d, 0.07, 0.04, 0.1);
  }
}
