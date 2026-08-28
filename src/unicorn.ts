import { drawBox, drawPyr } from './gl';

const BODY = [0.93, 0.94, 0.98];
const SHADOW = [0.78, 0.8, 0.88];
const HORN = [0.95, 0.82, 0.4];
const HOOF = [0.42, 0.44, 0.52];
const MANE = [0.72, 0.76, 0.92];
const EYE = [0.12, 0.12, 0.16];
const EAR = [0.95, 0.72, 0.78];

export function drawUnicorn(
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  yaw: number,
  s: number,
  splay: number
): void {
  const g = 1 - splay;
  const run = Math.sin(s * 3.6) * 0.55 * g;
  const bob = Math.abs(Math.sin(s * 3.6)) * 0.04 * g;

  const by = y + 0.55 * g + 0.2 * splay + bob;
  const bz = z + 0.15 * splay;
  drawBox(
    view,
    x,
    by,
    bz,
    0.15 * splay,
    yaw,
    0.78,
    0.5 * g + 0.22 * splay,
    1.35 + 0.35 * splay,
    BODY[0],
    BODY[1],
    BODY[2]
  );
  drawBox(view, x, by - 0.12, bz, 0, yaw, 0.62, 0.28, 1.05, SHADOW[0], SHADOW[1], SHADOW[2]);

  const ny = y + 0.82 * g + 0.28 * splay + bob;
  const nz = z + 0.72;
  drawBox(view, x, ny, nz, -0.35 * g, yaw, 0.28, 0.28, 0.42, BODY[0], BODY[1], BODY[2]);

  const hy = y + 0.92 * g + 0.32 * splay + bob;
  const hz = z + 1.12;
  drawBox(view, x, hy, hz, 0, yaw, 0.36, 0.3, 0.72, BODY[0], BODY[1], BODY[2]);
  drawPyr(view, x, hy + 0.32, hz + 0.12, 0, yaw, 0.11, 0.48, 0.11, HORN[0], HORN[1], HORN[2]);
  drawBox(view, x - 0.12, hy + 0.04, hz + 0.22, 0, yaw, 0.07, 0.08, 0.07, EYE[0], EYE[1], EYE[2]);
  drawBox(view, x + 0.12, hy + 0.04, hz + 0.22, 0, yaw, 0.07, 0.08, 0.07, EYE[0], EYE[1], EYE[2]);
  drawBox(view, x - 0.18, hy + 0.2, hz - 0.08, 0, yaw, 0.1, 0.16, 0.08, BODY[0], BODY[1], BODY[2]);
  drawBox(view, x + 0.18, hy + 0.2, hz - 0.08, 0, yaw, 0.1, 0.16, 0.08, BODY[0], BODY[1], BODY[2]);
  drawBox(view, x - 0.18, hy + 0.18, hz - 0.06, 0, yaw, 0.05, 0.08, 0.04, EAR[0], EAR[1], EAR[2]);
  drawBox(view, x + 0.18, hy + 0.18, hz - 0.06, 0, yaw, 0.05, 0.08, 0.04, EAR[0], EAR[1], EAR[2]);

  const maneY = y + 0.95 * g + 0.34 * splay + bob;
  drawBox(view, x, maneY + 0.08, z + 0.55, 0.4, yaw, 0.08, 0.22, 0.5, MANE[0], MANE[1], MANE[2]);
  drawBox(view, x, maneY, z + 0.85, 0.2, yaw, 0.07, 0.18, 0.35, MANE[0], MANE[1], MANE[2]);
  drawBox(
    view,
    x,
    y + 0.62 * g + 0.22 * splay + bob,
    z - 0.85,
    0.5,
    yaw,
    0.1,
    0.12,
    0.55,
    MANE[0],
    MANE[1],
    MANE[2]
  );
  drawBox(
    view,
    x,
    y + 0.5 * g + 0.18 * splay + bob,
    z - 1.15,
    0.8,
    yaw,
    0.08,
    0.08,
    0.4,
    MANE[0],
    MANE[1],
    MANE[2]
  );

  const legY = y + 0.22 * g + 0.08 * splay;
  const frontZ = z + 0.42 + 0.55 * splay;
  const backZ = z - 0.42 - 0.55 * splay;
  const fl = -1.15 * splay + run;
  const fr = -1.15 * splay - run;
  const bl = 1.15 * splay - run;
  const br = 1.15 * splay + run;
  leg(view, x - 0.26, legY, frontZ, fl, yaw, g);
  leg(view, x + 0.26, legY, frontZ, fr, yaw, g);
  leg(view, x - 0.26, legY, backZ, bl, yaw, g);
  leg(view, x + 0.26, legY, backZ, br, yaw, g);
}

function leg(
  view: Float32Array,
  x: number,
  y: number,
  z: number,
  rx: number,
  yaw: number,
  g: number
): void {
  const h = 0.44 * g + 0.18;
  drawBox(view, x, y, z, rx, yaw, 0.14, h, 0.14, BODY[0], BODY[1], BODY[2]);
  drawBox(view, x, y - h * 0.42, z, rx, yaw, 0.16, 0.1, 0.18, HOOF[0], HOOF[1], HOOF[2]);
}
