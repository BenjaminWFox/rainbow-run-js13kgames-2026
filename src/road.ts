import { BAND_W, RAINBOW, ROAD_W } from './constants';
import { drawBox } from './gl';
import { rgb } from './math';
import { pointOnPath, yawAt } from './path';

const BACK = 16;
const AHEAD = 90;

export function drawRoad(view: Float32Array, s: number): void {
  const c = pointOnPath(s);
  const yaw = yawAt(s);
  const zMid = c[2] + (AHEAD - BACK) * 0.5;
  const len = BACK + AHEAD;
  const half = ROAD_W * 0.5;
  for (let i = 0; i < 7; i++) {
    const col = rgb(RAINBOW[i]);
    const x = c[0] - half + (i + 0.5) * BAND_W;
    drawBox(view, x, -0.03, zMid, 0, yaw, BAND_W * 0.98, 0.06, len, col[0], col[1], col[2]);
  }
}
