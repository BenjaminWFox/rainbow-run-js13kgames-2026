const p = [0, 0, 0];
const t = [0, 0, 1];
const n = [1, 0, 0];

/** Phase 1: dead-straight along +Z. Phase 9 will replace these. */
export function pointOnPath(s: number): number[] {
  p[0] = 0;
  p[1] = 0;
  p[2] = s;
  return p;
}

export function tangent(_s: number): number[] {
  t[0] = 0;
  t[1] = 0;
  t[2] = 1;
  return t;
}

export function normal(_s: number): number[] {
  n[0] = 1;
  n[1] = 0;
  n[2] = 0;
  return n;
}

export function yawAt(_s: number): number {
  return 0;
}

export function worldPos(s: number, laneX: number, y: number, out: number[]): number[] {
  const c = pointOnPath(s);
  const side = normal(s);
  out[0] = c[0] + side[0] * laneX;
  out[1] = c[1] + y;
  out[2] = c[2] + side[2] * laneX;
  return out;
}
