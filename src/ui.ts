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
  SHOP_CAP,
  SHOP_NAMES,
  SHOP_ROWS,
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
let newBest = false;
let lastDist = 0;
let lastGems = 0;

type Btn = { x: number; y: number; w: number; h: number; label: string; id: number };

const btns: Btn[] = [];
let pauseBtn: Btn = { x: 16, y: 16, w: 52, h: 40, label: '', id: -1 };

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
  const w = ctx.measureText(text).width;
  const left = align === 'center' ? x - w * 0.5 : align === 'right' ? x - w : x;
  const padX = 12;
  const padY = padX * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(left - padX, y - padY, w + padX * 2, padY * 2);
  ctx.fillStyle = fill;
  ctx.fillText(text, left + nudge, y);
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

function addBtn(x: number, y: number, w: number, h: number, label: string, id: number): void {
  btns.push({ x, y, w, h, label, id });
}

function layout(): void {
  btns.length = 0;
  const cx = cssW * 0.5;
  const bw = Math.min(320, cssW * 0.7);
  const bh = 52;
  if (scene === SCENE_TITLE) {
    const soundY = cssH - 18 - bh;
    addBtn(cx - bw * 0.5, cssH * 0.28 + 118, bw, bh, 'START', 0);
    addBtn(cx - bw * 0.5, soundY - 66, bw, bh, 'UPGRADES', 1);
    addBtn(cx - bw * 0.5, soundY, bw, bh, muted ? 'SOUND: OFF' : 'SOUND: ON', 2);
  } else if (scene === SCENE_PAUSE) {
    addBtn(cx - bw * 0.5, cssH * 0.42, bw, bh, 'RESUME', 0);
    addBtn(cx - bw * 0.5, cssH * 0.42 + 66, bw, bh, 'QUIT', 1);
  } else if (scene === SCENE_SHOP) {
    for (let i = 0; i < SHOP_ROWS; i++) {
      addBtn(cx - bw * 0.5, cssH * 0.28 + i * 62, bw, 52, SHOP_NAMES[i], i);
    }
    addBtn(cx - bw * 0.5, cssH * 0.28 + SHOP_ROWS * 62 + 12, bw, bh, 'BACK', 9);
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
  ctx.font = '700 22px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let label = b.label;
  if (scene === SCENE_SHOP && b.id < SHOP_ROWS) {
    const rank = shopRanks[b.id];
    const price = shopPrice(b.id);
    label = b.label + '  ' + rank + '/' + SHOP_CAP + (rank >= SHOP_CAP ? '  MAX' : '  ' + price);
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
    if (id === 9) {
      scene = SCENE_TITLE;
      focus = 0;
      return;
    }
    if (tryBuy(id)) {
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
  if (code === 'ArrowDown' || code === 'KeyS') {
    focus = (focus + 1) % btns.length;
  } else if (code === 'ArrowUp' || code === 'KeyW') {
    focus = (focus + btns.length - 1) % btns.length;
  } else if (code === 'Enter' || code === 'Space') {
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
    plate(ctx, livesText || '♥ 0', cssW * 0.5, 88, 18, 'center', iframes > 0 ? '#faa' : '#f8a', 5);
  }

  if (scene === SCENE_TITLE) {
    rainbowTitle(ctx, 'RAINBOW RUN', cssH * 0.18, Math.min(72, cssW * 0.12));
    plate(ctx, 'BEST  ' + best + ' m', cssW * 0.5, cssH * 0.28, 22, 'center');
    plate(ctx, 'CRYSTALS  ' + banked, cssW * 0.5, cssH * 0.28 + 70, 20, 'center', '#7ef');
  }

  if (scene === SCENE_SHOP) {
    plate(ctx, 'UPGRADES', cssW * 0.5, cssH * 0.14, 32, 'center');
    plate(ctx, 'CRYSTALS  ' + banked, cssW * 0.5, cssH * 0.2, 20, 'center', '#7ef');
  }

  if (scene === SCENE_PAUSE) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, cssW, cssH);
    plate(ctx, 'PAUSED', cssW * 0.5, cssH * 0.3, 36, 'center');
  }

  if (scene === SCENE_DEATH) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cssW, cssH);
    const d0 = cssH * 0.28;
    const dStep = cssH * 0.13;
    plate(ctx, 'RUN OVER', cssW * 0.5, d0, 36, 'center');
    plate(ctx, lastDist + ' m', cssW * 0.5, d0 + dStep, 28, 'center');
    plate(ctx, '+' + lastGems + ' CRYSTALS', cssW * 0.5, d0 + dStep * 2, 22, 'center', '#7ef');
    if (newBest) {
      plate(ctx, 'NEW BEST!', cssW * 0.5, d0 + dStep * 3, 26, 'center', '#ffd24a');
    }
    plate(ctx, 'TAP TO CONTINUE', cssW * 0.5, cssH * 0.78, 36, 'center');
  }

  if (scene !== SCENE_RUN && scene !== SCENE_DEATH) {
    for (let i = 0; i < btns.length; i++) {
      drawBtn(ctx, btns[i], i === focus);
    }
  }
}
