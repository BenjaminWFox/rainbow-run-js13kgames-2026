import { FONT, RAINBOW } from './constants';
import { rgb } from './math';
import { applyMute, playPowerup } from './music';
import { iframes, lives, resetPlayer, runCrystals, s } from './player';
import {
  addBank,
  banked,
  best,
  muted,
  noteBest,
  SHOP_FLAVOR,
  SHOP_NAMES,
  SHOP_ROWS,
  shopCap,
  setMuted,
  shopPrice,
  shopRanks,
  tryBuy,
} from './save';
import { resetWorld } from './world';

export const SCENE_TITLE = 0;
export const SCENE_RUN = 1;
export const SCENE_PAUSE = 2;
export const SCENE_DEATH = 3;
export const SCENE_SHOP = 4;

export let scene = SCENE_TITLE;
export let cssW = 1;
export let cssH = 1;

let focus = 0;
let shopSel = 0;
let newBest = false;
let lastDist = 0;
let lastGems = 0;
let titleHoofY = 0;

export function setTitleHoofY(y: number): void {
  titleHoofY = y;
}

type Btn = { x: number; y: number; w: number; h: number; label: string; id: number };

const btns: Btn[] = [];
let pauseBtn: Btn = { x: 16, y: 16, w: 52, h: 40, label: '', id: -1 };
let flavorBox = { x: 0, y: 0, w: 0, h: 0 };

export function setViewSize(w: number, h: number): void {
  cssW = w;
  cssH = h;
}

export function startRun(): void {
  resetPlayer();
  resetWorld();
  scene = SCENE_RUN;
  focus = 0;
}

export function finishRun(showDeath: boolean): void {
  addBank(runCrystals);
  lastDist = s | 0;
  lastGems = runCrystals;
  newBest = noteBest(lastDist);
  scene = showDeath ? SCENE_DEATH : SCENE_TITLE;
  focus = 0;
}

export function pauseGame(): void {
  if (scene === SCENE_RUN) {
    scene = SCENE_PAUSE;
    focus = 0;
  }
}

export function resumeGame(): void {
  if (scene === SCENE_PAUSE) {
    scene = SCENE_RUN;
  }
}

function plate(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign,
  fill = '#fff',
  nudge = 0
): void {
  ctx.font = '600 ' + size + 'px ' + FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const m = ctx.measureText(text);
  const visL = m.actualBoundingBoxLeft;
  const visR = m.actualBoundingBoxRight;
  const drawX =
    align === 'center'
      ? x - (visR - visL) * 0.5 + nudge
      : align === 'right'
        ? x - visR + nudge
        : x + nudge;
  const padX = 12;
  const padY = padX * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(drawX - visL - padX, y - padY, visL + visR + padX * 2, padY * 2);
  ctx.fillStyle = fill;
  ctx.fillText(text, drawX, y);
}

function rainbowTitle(ctx: CanvasRenderingContext2D, text: string, y: number, size: number): void {
  ctx.font = '800 ' + size + 'px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const total = ctx.measureText(text).width;
  let x = cssW * 0.5 - total * 0.5;
  let ci = 0;
  for (const ch of text) {
    const col = rgb(RAINBOW[ci % 7]);
    ctx.fillStyle = '#000';
    ctx.fillText(ch, x + 2, y + 2);
    ctx.fillStyle =
      'rgb(' + ((col[0] * 255) | 0) + ',' + ((col[1] * 255) | 0) + ',' + ((col[2] * 255) | 0) + ')';
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width;
    if (ch !== ' ') {
      ci++;
    }
  }
}

function drawFlavor(ctx: CanvasRenderingContext2D, text: string): void {
  const { x, y, w, h } = flavorBox;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  if (!text) {
    return;
  }
  ctx.font = '600 15px ' + FONT;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = w - 24;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  const lineH = 20;
  const y0 = y + h * 0.5 - ((lines.length - 1) * lineH) * 0.5;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + w * 0.5, y0 + i * lineH);
  }
}

function addBtn(x: number, y: number, w: number, h: number, label: string, id: number): void {
  btns.push({ x, y, w, h, label, id });
}

function layout(): void {
  btns.length = 0;
  const cx = cssW * 0.5;
  const bw = Math.min(320, cssW * 0.7);
  const bh = 52;
  if (scene === SCENE_TITLE) {
    const smallW = Math.min(148, cssW * 0.28 + 20);
    const smallH = 52;
    const gap = 6;
    const startH = 44;
    const startY = titleHoofY > 8 ? titleHoofY + 31 : cssH * 0.62;
    addBtn(cx - bw * 0.5, startY, bw, startH, 'START', 0);
    const rowY = startY + startH + gap;
    const rowW = smallW * 2 + gap;
    addBtn(cx - rowW * 0.5, rowY, smallW, smallH, 'UPGRADES', 1);
    addBtn(
      cx - rowW * 0.5 + smallW + gap,
      rowY,
      smallW,
      smallH,
      muted ? 'SOUND: OFF' : 'SOUND: ON',
      2
    );
  } else if (scene === SCENE_PAUSE) {
    addBtn(cx - bw * 0.5, cssH * 0.42, bw, bh, 'RESUME', 0);
    addBtn(cx - bw * 0.5, cssH * 0.42 + 66, bw, bh, 'QUIT', 1);
  } else if (scene === SCENE_SHOP) {
    const colW = Math.min(210, cssW * 0.44);
    const gap = 10;
    const rowH = 44;
    const left = cx - colW - gap * 0.5;
    const top = cssH * 0.24;
    const rows = (SHOP_ROWS + 1) >> 1;
    for (let i = 0; i < SHOP_ROWS; i++) {
      addBtn(left + (i & 1) * (colW + gap), top + (i >> 1) * (rowH + 8), colW, rowH, SHOP_NAMES[i], i);
    }
    flavorBox = {
      x: left,
      y: top + rows * (rowH + 8) + 2,
      w: colW * 2 + gap,
      h: 64,
    };
    const footY = flavorBox.y + flavorBox.h + 10;
    addBtn(left, footY, colW, bh, 'BACK', 20);
    addBtn(left + colW + gap, footY, colW, bh, 'BUY', 21);
  }
  pauseBtn = { x: 14, y: 12, w: 48, h: 40, label: '', id: -1 };
}

function drawBtn(ctx: CanvasRenderingContext2D, b: Btn, selected: boolean): void {
  ctx.fillStyle = selected ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.55)';
  roundRect(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? '#111' : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = selected ? '#111' : '#fff';
  ctx.font =
    '700 ' +
    (b.label === 'START'
      ? 28
      : b.label === 'UPGRADES' || b.label.startsWith('SOUND')
        ? 18
        : scene === SCENE_SHOP && b.id < SHOP_ROWS
          ? 15
          : 22) +
    'px ' +
    FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let label = b.label;
  if (scene === SCENE_SHOP && b.id < SHOP_ROWS) {
    const rank = shopRanks[b.id];
    const cap = shopCap(b.id);
    const price = shopPrice(b.id);
    label = b.label + '  ' + rank + '/' + cap + (rank >= cap ? '' : '  ' + price);
  }
  ctx.fillText(label, b.x + b.w * 0.5, b.y + b.h * 0.5);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function hitPause(x: number, y: number): boolean {
  const b = pauseBtn;
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function pickBtn(x: number, y: number): number {
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return i;
    }
  }
  return -1;
}

function activate(id: number): void {
  if (scene === SCENE_TITLE) {
    if (id === 0) {
      startRun();
    } else if (id === 1) {
      scene = SCENE_SHOP;
      focus = 0;
      shopSel = 0;
    } else if (id === 2) {
      setMuted(!muted);
      applyMute();
    }
    return;
  }
  if (scene === SCENE_PAUSE) {
    if (id === 0) {
      resumeGame();
    } else {
      finishRun(false);
    }
    return;
  }
  if (scene === SCENE_SHOP) {
    if (id < SHOP_ROWS) {
      shopSel = id;
      return;
    }
    if (id === 20) {
      scene = SCENE_TITLE;
      focus = 0;
      return;
    }
    if (id === 21 && tryBuy(shopSel)) {
      playPowerup();
    }
  }
}

export function handleTap(x: number, y: number): void {
  if (scene === SCENE_DEATH) {
    scene = SCENE_TITLE;
    focus = 0;
    return;
  }
  if (scene === SCENE_RUN) {
    if (hitPause(x, y)) {
      pauseGame();
    }
    return;
  }
  layout();
  const i = pickBtn(x, y);
  if (i >= 0) {
    focus = i;
    activate(btns[i].id);
  }
}

export function handleMenuKey(code: string): void {
  if (scene === SCENE_DEATH) {
    scene = SCENE_TITLE;
    return;
  }
  if (scene === SCENE_RUN) {
    return;
  }
  layout();
  if (!btns.length) {
    return;
  }
  if (scene === SCENE_TITLE) {
    if (code === 'ArrowDown' || code === 'KeyS') {
      focus = focus === 0 ? 1 : 0;
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      focus = focus === 0 ? 1 : 0;
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      focus = 1;
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      focus = 2;
    }
  } else if (scene === SCENE_SHOP) {
    const last = btns.length - 1;
    if (code === 'ArrowDown' || code === 'KeyS') {
      focus = Math.min(last, focus + 2);
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      focus = Math.max(0, focus - 2);
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      if (focus & 1) {
        focus--;
      }
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      if (!(focus & 1) && focus < last) {
        focus++;
      }
    }
    if (focus < SHOP_ROWS) {
      shopSel = focus;
    }
  } else if (code === 'ArrowDown' || code === 'KeyS') {
    focus = (focus + 1) % btns.length;
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    focus = (focus + btns.length - 1) % btns.length;
  }
  if (code === 'Enter' || code === 'Space') {
    activate(btns[focus].id);
  } else if (code === 'Escape' && (scene === SCENE_SHOP || scene === SCENE_PAUSE)) {
    if (scene === SCENE_PAUSE) {
      resumeGame();
    } else {
      scene = SCENE_TITLE;
      focus = 0;
    }
  }
}

export function drawUi(ctx: CanvasRenderingContext2D): void {
  layout();
  ctx.clearRect(0, 0, cssW, cssH);

  if (scene === SCENE_RUN || scene === SCENE_PAUSE) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, pauseBtn.x, pauseBtn.y, pauseBtn.w, pauseBtn.h, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(pauseBtn.x + 16, pauseBtn.y + 10, 6, 20);
    ctx.fillRect(pauseBtn.x + 28, pauseBtn.y + 10, 6, 20);
    plate(ctx, (s | 0) + ' m', cssW * 0.5, 36, 28, 'center');
    plate(ctx, String(runCrystals), cssW - 24, 36, 24, 'right', '#7ef');
    let livesText = '';
    for (let i = 0; i < lives; i++) {
      if (i) {
        livesText += ' ';
      }
      livesText += '♥';
    }
    plate(ctx, livesText || '♥ 0', cssW * 0.5, 88, 18, 'center', iframes > 0 ? '#faa' : '#f8a');
  }

  if (scene === SCENE_TITLE) {
    rainbowTitle(ctx, 'RAINBOW RUN', cssH * 0.18 - 50, Math.min(72, cssW * 0.12));
    plate(ctx, 'BEST  ' + best + ' m', cssW * 0.5, cssH * 0.28 - 50, 22, 'center');
    plate(ctx, 'CRYSTALS  ' + banked, cssW * 0.5, cssH * 0.28 + 20, 20, 'center', '#7ef');
  }

  if (scene === SCENE_SHOP) {
    plate(ctx, 'UPGRADES', cssW * 0.5, cssH * 0.14 - 20, 32, 'center');
    plate(ctx, 'CRYSTALS  ' + banked, cssW * 0.5, cssH * 0.2 - 10, 20, 'center', '#7ef');
    drawFlavor(ctx, SHOP_FLAVOR[shopSel]);
  }

  if (scene === SCENE_PAUSE) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, cssW, cssH);
    plate(ctx, 'PAUSED', cssW * 0.5, cssH * 0.3, 36, 'center');
  }

  if (scene === SCENE_DEATH) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cssW, cssH);
    const d0 = cssH * 0.18 - 50;
    const d1 = cssH * 0.28 - 50;
    const d2 = cssH * 0.28 + 20;
    rainbowTitle(ctx, 'RUN OVER', d0, Math.min(72, cssW * 0.12));
    plate(ctx, lastDist + ' m', cssW * 0.5, d1, 28, 'center');
    plate(ctx, '+' + lastGems + ' CRYSTALS', cssW * 0.5, d2, 22, 'center', '#7ef');
    if (newBest) {
      plate(ctx, 'NEW BEST!', cssW * 0.5, d2 + (d2 - d1), 26, 'center', '#ffd24a');
    }
    plate(ctx, 'TAP TO CONTINUE', cssW * 0.5, cssH * 0.88, 36, 'center');
  }

  if (scene !== SCENE_RUN && scene !== SCENE_DEATH) {
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const on =
        scene === SCENE_SHOP && b.id < SHOP_ROWS ? b.id === shopSel : i === focus;
      drawBtn(ctx, b, on);
    }
  }
}
