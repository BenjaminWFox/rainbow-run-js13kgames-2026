import { BAND_W, RAINBOW, ROAD_W } from './constants';
import { drawTris } from './gl';
import { rgb } from './math';
import { sampleRange } from './path';

const BACK = 16;
const AHEAD = 90;
const Y = -0.02;

const xs: number[] = [];
const zs: number[] = [];
const nxs: number[] = [];
const nzs: number[] = [];
const bands: number[][] = [[], [], [], [], [], [], []];

export function drawRoad(view: Float32Array, s: number): void {
  sampleRange(s - BACK, s + AHEAD, xs, zs, nxs, nzs);
  const n = xs.length;
  if (n < 2) {
    return;
  }
  const half = ROAD_W * 0.5;
  for (let b = 0; b < 7; b++) {
    bands[b].length = 0;
    const u0 = -half + b * BAND_W;
    const u1 = u0 + BAND_W;
    for (let i = 0; i < n - 1; i++) {
      const ax = xs[i] + nxs[i] * u0;
      const az = zs[i] + nzs[i] * u0;
      const bx = xs[i] + nxs[i] * u1;
      const bz = zs[i] + nzs[i] * u1;
      const cx = xs[i + 1] + nxs[i + 1] * u1;
      const cz = zs[i + 1] + nzs[i + 1] * u1;
      const dx = xs[i + 1] + nxs[i + 1] * u0;
      const dz = zs[i + 1] + nzs[i + 1] * u0;
      const v = bands[b];
      v.push(ax, Y, az, bx, Y, bz, cx, Y, cz);
      v.push(ax, Y, az, cx, Y, cz, dx, Y, dz);
    }
    const col = rgb(RAINBOW[b]);
    drawTris(view, bands[b], col[0], col[1], col[2]);
  }
}
