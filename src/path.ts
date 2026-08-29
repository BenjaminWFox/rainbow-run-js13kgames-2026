import { ARC_R_MIN, ARC_R0, ARC_TIGHTEN } from './constants';

type Seg = {
  r: number;
  s0: number;
  len: number;
  x0: number;
  z0: number;
  yaw0: number;
};

const segs: Seg[] = [];
const p = [0, 0, 0];
export const pathT = [0, 0, 1];
const n = [1, 0, 0];

let seed = 1;
let curYaw = 0;
let hint = 0;
let pathEnd = 0;
let xEnd = 0;
let zEnd = 0;
let yawEnd = 0;
let lastArc = false;
let lastSign = 0;

function rng(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

function radiusAt(s: number): number {
  return Math.max(ARC_R_MIN, ARC_R0 - s * ARC_TIGHTEN);
}

function appendSeg(): void {
  const s0 = pathEnd;
  const x0 = xEnd;
  const z0 = zEnd;
  const yaw0 = yawEnd;
  const straight = lastArc || rng() < 0.38;
  if (straight) {
    const len = 12 + rng() * 20;
    segs.push({ r: 0, s0, len, x0, z0, yaw0 });
    pathEnd = s0 + len;
    xEnd = x0 + len * Math.sin(yaw0);
    zEnd = z0 + len * Math.cos(yaw0);
    lastArc = false;
    return;
  }
  const R = radiusAt(s0);
  const sign = lastSign && rng() < 0.72 ? -lastSign : rng() < 0.5 ? 1 : -1;
  lastSign = sign;
  const sweep = 0.52 + rng() * 0.95 + Math.min(0.4, s0 * 0.00045);
  const r = sign * R;
  const len = R * sweep;
  segs.push({ r, s0, len, x0, z0, yaw0 });
  pathEnd = s0 + len;
  yawEnd = yaw0 + len / r;
  xEnd = x0 + r * (Math.cos(yaw0) - Math.cos(yawEnd));
  zEnd = z0 - r * (Math.sin(yaw0) - Math.sin(yawEnd));
  lastArc = true;
}

function ensureTo(until: number): void {
  if (!segs.length) {
    resetPath();
  }
  while (pathEnd < until) {
    appendSeg();
  }
}

function evalAt(s: number): void {
  ensureTo(s + 40);
  let i = hint;
  if (i >= segs.length || s < segs[i].s0) {
    i = 0;
  }
  while (i < segs.length - 1 && s >= segs[i].s0 + segs[i].len) {
    i++;
  }
  hint = i;
  const seg = segs[i];
  const ds = Math.min(seg.len, Math.max(0, s - seg.s0));
  let yaw = seg.yaw0;
  if (seg.r) {
    yaw = seg.yaw0 + ds / seg.r;
    p[0] = seg.x0 + seg.r * (Math.cos(seg.yaw0) - Math.cos(yaw));
    p[2] = seg.z0 - seg.r * (Math.sin(seg.yaw0) - Math.sin(yaw));
  } else {
    p[0] = seg.x0 + ds * Math.sin(yaw);
    p[2] = seg.z0 + ds * Math.cos(yaw);
  }
  p[1] = 0;
  curYaw = yaw;
  pathT[0] = Math.sin(yaw);
  pathT[1] = 0;
  pathT[2] = Math.cos(yaw);
  n[0] = Math.cos(yaw);
  n[1] = 0;
  n[2] = -Math.sin(yaw);
}

/** Rebuild the polyline from a fixed seed (same path every reset). */
export function resetPath(): void {
  segs.length = 0;
  hint = 0;
  seed = 1;
  lastArc = false;
  lastSign = 0;
  segs.push({ r: 0, s0: -24, len: 48, x0: 0, z0: -24, yaw0: 0 });
  pathEnd = 24;
  xEnd = 0;
  zEnd = 24;
  yawEnd = 0;
}

export function yawAt(s: number): number {
  evalAt(s);
  return curYaw;
}

export function pathFrame(s: number, lx: number, y: number, lz: number, out: number[]): number[] {
  evalAt(s);
  out[0] = p[0] + n[0] * lx + pathT[0] * lz;
  out[1] = p[1] + y;
  out[2] = p[2] + n[2] * lx + pathT[2] * lz;
  return out;
}

export function worldPos(s: number, laneX: number, y: number, out: number[]): number[] {
  return pathFrame(s, laneX, y, 0, out);
}

/** Walk [s0, s1] with long steps on straights and tighter steps on arcs. */
export function sampleRange(
  s0: number,
  s1: number,
  xs: number[],
  zs: number[],
  nxs: number[],
  nzs: number[]
): void {
  xs.length = 0;
  zs.length = 0;
  nxs.length = 0;
  nzs.length = 0;
  let s = s0;
  let guard = 0;
  while (guard++ < 400) {
    evalAt(s);
    xs.push(p[0]);
    zs.push(p[2]);
    nxs.push(n[0]);
    nzs.push(n[2]);
    if (s >= s1 - 0.02) {
      break;
    }
    const seg = segs[hint];
    const segEnd = seg.s0 + seg.len;
    const step =
      seg.r === 0 ? segEnd - s : Math.min(segEnd - s, Math.max(0.8, Math.abs(seg.r) * 0.04));
    s = Math.min(s1, s + Math.max(0.5, step));
  }
}
