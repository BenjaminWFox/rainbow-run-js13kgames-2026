import { drawBox, drawPyr, setDepthWrite, setDrawAlpha } from './gl';
import { pathFrame, yawAt } from './path';
import { charge, shield, swoop, wings } from './player';
import { beginShadows, endShadows, stampShadow } from './shadow';

const BODY = [0.93, 0.94, 0.98];
const SHADOW = [0.78, 0.8, 0.88];
const HORN = [0.95, 0.82, 0.4];
const HOOF = [0.42, 0.44, 0.52];
const MANE = [0.72, 0.76, 0.92];
const EYE = [0.12, 0.12, 0.16];
const EAR = [0.95, 0.72, 0.78];

const pos = [0, 0, 0];

export function drawUnicorn(
  view: Float32Array,
  laneX: number,
  y: number,
  s: number,
  splay: number
): void {
  const yaw = yawAt(s);
  const g = 1 - splay;
  const run = Math.sin(s * 3.6) * 0.55 * g;
  const bob = Math.abs(Math.sin(s * 3.6)) * 0.04 * g;
  if (charge > 0) {
    y += 0.5 * splay;
  }

  const box = (
    lx: number,
    ly: number,
    lz: number,
    rx: number,
    sx: number,
    sy: number,
    sz: number,
    r: number,
    gc: number,
    b: number
  ): void => {
    pathFrame(s, laneX + lx, ly, lz, pos);
    drawBox(view, pos[0], pos[1], pos[2], rx, yaw, sx, sy, sz, r, gc, b);
  };
  const pyr = (
    lx: number,
    ly: number,
    lz: number,
    rx: number,
    sx: number,
    sy: number,
    sz: number,
    r: number,
    gc: number,
    b: number
  ): void => {
    pathFrame(s, laneX + lx, ly, lz, pos);
    drawPyr(view, pos[0], pos[1], pos[2], rx, yaw, sx, sy, sz, r, gc, b);
  };

  const by = y + 0.55 * g + 0.2 * splay + bob;
  const ny = y + 0.82 * g + 0.28 * splay + bob;
  const hy = y + 0.92 * g + 0.32 * splay + bob;
  const maneY = y + 0.95 * g + 0.34 * splay + bob;
  const tailY = y + 0.5 * g + 0.18 * splay + bob;
  const legY = y + 0.22 * g + 0.08 * splay;
  const frontZ = 0.42 + 0.55 * splay;
  const backZ = -0.42 - 0.55 * splay;

  const stamp = (lx: number, ly: number, lz: number, sx: number, sz: number): void => {
    stampShadow(view, s, laneX, lx, ly, lz, yaw, sx, sz);
  };

  const lift = y < 0 ? 0 : y;
  beginShadows(1 / (1 + lift * 0.28));
  stamp(0, by, 0.15 * splay, 0.8, 1.35 + 0.35 * splay);
  stamp(0, ny, 0.72, 0.3, 0.42);
  stamp(0, hy, 1.12, 0.38, 0.72);
  stamp(0, hy + 0.32, 1.24, 0.1, 0.12);
  stamp(0, tailY, -1.15, 0.1, 0.45);
  stamp(-0.26, legY, frontZ, 0.16, 0.18);
  stamp(0.26, legY, frontZ, 0.16, 0.18);
  stamp(-0.26, legY, backZ, 0.16, 0.18);
  stamp(0.26, legY, backZ, 0.16, 0.18);
  if (wings || swoop > 0) {
    stamp(-0.68, by + 0.18, 0, 0.58, 0.46);
    stamp(0.68, by + 0.18, 0, 0.58, 0.46);
  }
  endShadows();

  if (wings || swoop > 0) {
    const flap = swoop > 0 ? Math.sin(swoop * 22) * 0.35 : 0;
    pathFrame(s, laneX - 0.68, by + 0.18, 0, pos);
    drawBox(view, pos[0], pos[1], pos[2], -0.22 - flap, yaw, 0.58, 0.1, 0.46, 0.58, 0.6, 0.66, -0.28);
    pathFrame(s, laneX + 0.68, by + 0.18, 0, pos);
    drawBox(view, pos[0], pos[1], pos[2], -0.22 - flap, yaw, 0.58, 0.1, 0.46, 0.58, 0.6, 0.66, 0.28);
  }
  box(
    0,
    by,
    0.15 * splay,
    0.15 * splay,
    0.78,
    0.5 * g + 0.22 * splay,
    1.35 + 0.35 * splay,
    BODY[0],
    BODY[1],
    BODY[2]
  );
  box(0, by - 0.12, 0.15 * splay, 0, 0.62, 0.28, 1.05, SHADOW[0], SHADOW[1], SHADOW[2]);

  box(0, ny, 0.72, -0.35 * g, 0.28, 0.28, 0.42, BODY[0], BODY[1], BODY[2]);

  box(0, hy, 1.12, 0, 0.36, 0.3, 0.72, BODY[0], BODY[1], BODY[2]);
  pyr(0, hy + 0.32, 1.24, 0, 0.11, 0.48, 0.11, HORN[0], HORN[1], HORN[2]);
  box(-0.12, hy + 0.04, 1.34, 0, 0.07, 0.08, 0.07, EYE[0], EYE[1], EYE[2]);
  box(0.12, hy + 0.04, 1.34, 0, 0.07, 0.08, 0.07, EYE[0], EYE[1], EYE[2]);
  box(-0.18, hy + 0.2, 1.04, 0, 0.1, 0.16, 0.08, BODY[0], BODY[1], BODY[2]);
  box(0.18, hy + 0.2, 1.04, 0, 0.1, 0.16, 0.08, BODY[0], BODY[1], BODY[2]);
  box(-0.18, hy + 0.18, 1.06, 0, 0.05, 0.08, 0.04, EAR[0], EAR[1], EAR[2]);
  box(0.18, hy + 0.18, 1.06, 0, 0.05, 0.08, 0.04, EAR[0], EAR[1], EAR[2]);

  box(0, maneY + 0.08, 0.55, 0.4, 0.08, 0.22, 0.5, MANE[0], MANE[1], MANE[2]);
  box(0, maneY, 0.85, 0.2, 0.07, 0.18, 0.35, MANE[0], MANE[1], MANE[2]);
  box(0, y + 0.62 * g + 0.22 * splay + bob, -0.85, 0.5, 0.1, 0.12, 0.55, MANE[0], MANE[1], MANE[2]);
  box(0, tailY, -1.15, 0.8, 0.08, 0.08, 0.4, MANE[0], MANE[1], MANE[2]);

  const fl = -1.15 * splay + run;
  const fr = -1.15 * splay - run;
  const bl = 1.15 * splay - run;
  const br = 1.15 * splay + run;
  const lh = 0.44 * g + 0.18;
  box(-0.26, legY, frontZ, fl, 0.14, lh, 0.14, BODY[0], BODY[1], BODY[2]);
  box(-0.26, legY - lh * 0.42, frontZ, fl, 0.16, 0.1, 0.18, HOOF[0], HOOF[1], HOOF[2]);
  box(0.26, legY, frontZ, fr, 0.14, lh, 0.14, BODY[0], BODY[1], BODY[2]);
  box(0.26, legY - lh * 0.42, frontZ, fr, 0.16, 0.1, 0.18, HOOF[0], HOOF[1], HOOF[2]);
  box(-0.26, legY, backZ, bl, 0.14, lh, 0.14, BODY[0], BODY[1], BODY[2]);
  box(-0.26, legY - lh * 0.42, backZ, bl, 0.16, 0.1, 0.18, HOOF[0], HOOF[1], HOOF[2]);
  box(0.26, legY, backZ, br, 0.14, lh, 0.14, BODY[0], BODY[1], BODY[2]);
  box(0.26, legY - lh * 0.42, backZ, br, 0.16, 0.1, 0.18, HOOF[0], HOOF[1], HOOF[2]);

  if (shield) {
    setDepthWrite(false);
    setDrawAlpha(0.22);
    box(0, by, 0.15 * splay, 0.15 * splay, 1.12, 0.82, 1.75, 1, 0.82, 0.18);
    setDrawAlpha(1);
    setDepthWrite(true);
  }
}
