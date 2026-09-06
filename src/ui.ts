import { CHARGE_DIST, FONT, RAINBOW } from './constants';
import { rgb } from './math';
import { applyMute, playCrystal, playHit, playPowerup } from './music';
import { charge, iframes, lives, resetPlayer, runCrystals, s } from './player';
import {
  addBank,
  banked,
  best,
  muted,
  NAME_MAX,
  noteBest,
  playerId,
  playerName,
  setPlayerName,
  SHOP_CAPS,
  SHOP_FLAVOR,
  SHOP_NAMES,
  SHOP_PRICES,
  SHOP_ROWS,
  setMuted,
  shopRanks,
  tryBuy,
} from './save';
import { boardRows, publishName, publishScore } from './ladder';
import { resetWorld } from './world';

export const SCENE_TITLE = 0;
export const SCENE_RUN = 1;
export const SCENE_PAUSE = 2;
export const SCENE_DEATH = 3;
export const SCENE_SHOP = 4;
export const SCENE_SCORES = 5;

export let scene = SCENE_TITLE;
let cssW = 1;
export let cssH = 1;

let focus = 0;
let shopSel = 0;
let newBest = false;
let lastDist = 0;
let lastGems = 0;
let titleHoofY = 0;
let deathAt = 0;
const DEATH_WAIT = 1250;

export function setTitleHoofY(y: number): void {
  titleHoofY = y;
}

type Btn = { x: number; y: number; w: number; h: number; label: string; id: number };

const btns: Btn[] = [];
const pauseBtn = { x: 14, y: 12, w: 48, h: 40 };
let flavorBox = { x: 0, y: 0, w: 0, h: 0 };
const nameBox = { x: 0, y: 0, w: 0, h: 0 };
let nameField: HTMLInputElement | undefined;
let nameFieldOpen = false;

export function setViewSize(w: number, h: number): void {
  cssW = w;
  cssH = h;
}

function startRun(): void {
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
  if (newBest) {
    publishScore();
  }
  if (showDeath) {
    deathAt = Date.now();
    scene = SCENE_DEATH;
  } else {
    scene = SCENE_TITLE;
  }
  focus = 0;
}

function deathReady(): boolean {
  return Date.now() - deathAt >= DEATH_WAIT;
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

function scoreBox(): { l: number; r: number } {
  const w = Math.min(220, cssW * 0.44);
  const g = 8;
  const l = cssW * 0.5 - w - g * 0.5;
  return { l, r: l + w * 2 + g };
}

function drawSaveStats(
  ctx: CanvasRenderingContext2D,
  l: number,
  r: number,
  y: number,
  run?: 1
): void {
  plate(ctx, 'BEST  ' + best + ' m', l, y, 20, 'left');
  plate(ctx, 'CRYSTALS  ' + banked, r, y, 20, 'right', '#7ef');
  if (run) {
    plate(ctx, lastDist + ' m', l, y + 38, 20, 'left', newBest ? '#ffd24a' : '#fff');
    plate(ctx, '+' + lastGems, r, y + 38, 20, 'right', '#7ef');
  }
}

function addScoreChrome(nameY: number, foot: string): void {
  const { l, r } = scoreBox();
  const setW = Math.min(148, (r - l) * 0.4);
  nameBox.x = l;
  nameBox.y = nameY;
  nameBox.w = r - l - setW - 8;
  nameBox.h = 44;
  addBtn(l + nameBox.w + 8, nameY, setW, nameBox.h, 'UPDATE NAME', 0);
  if (foot) {
    addBtn(l, cssH * 0.88, r - l, 52, foot, 1);
  }
}

function drawScoreBoard(ctx: CanvasRenderingContext2D): void {
  const { l, r } = scoreBox();
  drawLadder(ctx, l, r, nameBox.y + nameBox.h + 14, 20);
}

function plate(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign,
  fill = '#fff'
): void {
  ctx.font = '600 ' + size + 'px ' + FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const m = ctx.measureText(text);
  const visL = m.actualBoundingBoxLeft;
  const visR = m.actualBoundingBoxRight;
  const drawX = align === 'center' ? x - (visR - visL) * 0.5 : align === 'right' ? x - visR : x;
  const padX = 12;
  const padY = padX * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(drawX - visL - padX, y - padY, visL + visR + padX * 2, padY * 2);
  ctx.fillStyle = fill;
  ctx.fillText(text, drawX, y);
}

function titleWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.font = '800 ' + size + 'px ' + FONT;
  return ctx.measureText(text).width;
}

function rainbowTitle(ctx: CanvasRenderingContext2D, text: string, y: number, size: number): void {
  ctx.font = '800 ' + size + 'px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const total = titleWidth(ctx, text, size);
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

function ladderLine(rank: number, row: { n: string; s: number } | undefined): string {
  return row ? rank + '  ' + row.s + ' - ' + row.n : rank + '  ...';
}

function drawLadder(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  y: number,
  slots: number
): number {
  const cols = slots > 5 ? 2 : 1;
  const perCol = slots / cols;
  const size = slots > 5 ? 15 : 16;
  const lineH = slots > 5 ? 22 : 24;
  const padX = 14;
  const padY = 10;
  const rows = boardRows(slots);
  ctx.font = '600 ' + size + 'px ' + FONT;
  let w = right - left;
  if (cols === 1) {
    let maxW = 0;
    for (let i = 0; i < slots; i++) {
      maxW = Math.max(maxW, ctx.measureText(ladderLine(i + 1, rows[i])).width);
    }
    w = maxW + padX * 2;
    left = (left + right - w) * 0.5;
  }
  const h = lineH * perCol + padY * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, left, y, w, h, 10);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c++) {
    const x = left + padX + c * (w * 0.5);
    for (let i = 0; i < perCol; i++) {
      const rank = c * perCol + i + 1;
      const ly = y + padY + lineH * (i + 0.5);
      drawLadderSlot(ctx, x, ly, lineH, rank, rows[rank - 1]);
    }
  }
  return h;
}

function drawLadderSlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lineH: number,
  rank: number,
  row: { n: string; s: number; self: boolean } | undefined
): void {
  const self = !!row?.self;
  const label = ladderLine(rank, row);
  if (self) {
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, x - 6, y - lineH * 0.5 + 2, tw + 12, lineH - 4, 6);
    ctx.fill();
  }
  ctx.fillStyle = self ? '#111' : '#fff';
  ctx.fillText(label, x, y);
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
  const y0 = y + h * 0.5 - (lines.length - 1) * lineH * 0.5;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + w * 0.5, y0 + i * lineH);
  }
}

function addBtn(x: number, y: number, w: number, h: number, label: string, id: number): void {
  btns.push({ x, y, w, h, label, id });
}

function goTitle(): void {
  scene = SCENE_TITLE;
  focus = 0;
}

function commitName(): void {
  if (nameField) {
    setPlayerName(nameField.value);
    nameField.value = playerName;
    publishName();
  }
}

function ensureNameField(): HTMLInputElement {
  if (nameField) {
    return nameField;
  }
  const el = document.createElement('input');
  el.id = 'name';
  el.maxLength = NAME_MAX;
  el.autocomplete = 'off';
  el.spellcheck = false;
  el.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Enter') {
      e.preventDefault();
      commitName();
      el.blur();
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      el.blur();
      if (scene !== SCENE_DEATH || deathReady()) {
        goTitle();
      }
    }
  });
  el.addEventListener('blur', () => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
    });
  });
  document.body.appendChild(el);
  nameField = el;
  return el;
}

function syncNameField(): void {
  const show = scene === SCENE_SCORES || scene === SCENE_DEATH;
  const el = ensureNameField();
  el.style.display = show ? 'block' : 'none';
  el.placeholder = playerId;
  if (show) {
    el.style.left = nameBox.x + 'px';
    el.style.top = nameBox.y + 'px';
    el.style.width = nameBox.w + 'px';
    el.style.height = nameBox.h + 'px';
    if (!nameFieldOpen) {
      el.value = playerName;
      nameFieldOpen = true;
    }
  } else {
    if (nameFieldOpen && document.activeElement === el) {
      el.blur();
    }
    nameFieldOpen = false;
  }
}

function layout(): void {
  btns.length = 0;
  const cx = cssW * 0.5;
  const bw = Math.min(320, cssW * 0.7);
  const bh = 52;
  if (scene === SCENE_TITLE) {
    const muteW = 56;
    const smallW = Math.min(160, (Math.min(cssW * 0.92, 420) - muteW - 12) * 0.5);
    const smallH = 52;
    const gap = 6;
    const startH = 44;
    const hoofY = titleHoofY > 8 ? titleHoofY + 31 : cssH * 0.62;
    const startY = hoofY;
    addBtn(cx - bw * 0.5, startY, bw, startH, 'START', 0);
    const rowY = startY + startH + gap;
    const rowW = smallW * 2 + muteW + gap * 2;
    const rowX = cx - rowW * 0.5;
    addBtn(rowX, rowY, smallW, smallH, 'UPGRADES', 1);
    addBtn(rowX + smallW + gap, rowY, muteW, smallH, muted ? '🔇' : '🔈', 2);
    addBtn(rowX + smallW + gap + muteW + gap, rowY, smallW, smallH, 'HIGH SCORES', 3);
  } else if (scene === SCENE_SCORES) {
    addScoreChrome(cssH * 0.16, 'BACK');
  } else if (scene === SCENE_DEATH) {
    addScoreChrome(cssH * 0.155 + 70, deathReady() ? 'CONTINUE' : '');
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
      addBtn(
        left + (i & 1) * (colW + gap),
        top + (i >> 1) * (rowH + 8),
        colW,
        rowH,
        SHOP_NAMES[i],
        i
      );
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
      : b.label === '🔈' || b.label === '🔇'
        ? 24
        : b.label === 'UPGRADES' || b.label === 'HIGH SCORES' || b.label === 'UPDATE NAME'
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
    const cap = SHOP_CAPS[b.id];
    label = b.label + '  ' + rank + '/' + cap + (rank >= cap ? '' : '  ' + SHOP_PRICES[b.id]);
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

function hitPause(x: number, y: number): boolean {
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

function buySelected(): void {
  if (shopRanks[shopSel] >= SHOP_CAPS[shopSel]) {
    playHit();
    return;
  }
  playCrystal();
  if (tryBuy(shopSel)) {
    playPowerup();
  }
}

function activate(id: number): void {
  if (scene === SCENE_TITLE && id === 2) {
    if (muted) {
      setMuted(false);
      applyMute();
      playCrystal();
    } else {
      playCrystal();
      setMuted(true);
      applyMute();
    }
    return;
  }
  if (scene === SCENE_SHOP && id === 21) {
    buySelected();
    return;
  }
  playCrystal();
  if (scene === SCENE_TITLE) {
    if (id === 0) {
      startRun();
    } else if (id === 1) {
      scene = SCENE_SHOP;
      focus = 0;
      shopSel = 0;
    } else if (id === 3) {
      scene = SCENE_SCORES;
      focus = 0;
    }
    return;
  }
  if (scene === SCENE_SCORES || scene === SCENE_DEATH) {
    if (id === 0) {
      commitName();
    } else if (scene !== SCENE_DEATH || deathReady()) {
      goTitle();
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
      goTitle();
    }
  }
}

export function handleTap(x: number, y: number): void {
  if (scene === SCENE_RUN) {
    if (hitPause(x, y)) {
      playCrystal();
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
  if (scene === SCENE_RUN) {
    return;
  }
  if (document.activeElement === nameField) {
    return;
  }
  layout();
  if (!btns.length) {
    return;
  }
  if (scene === SCENE_TITLE) {
    if (code === 'ArrowDown' || code === 'KeyS') {
      focus = focus === 0 ? 2 : focus;
    } else if (code === 'ArrowUp' || code === 'KeyW') {
      focus = focus > 0 ? 0 : focus;
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      focus = focus === 3 ? 2 : focus === 2 ? 1 : focus;
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      focus = focus === 1 ? 2 : focus === 2 ? 3 : focus;
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
  if (code === 'Enter' && scene === SCENE_SHOP) {
    const id = btns[focus].id;
    if (id === 20) {
      activate(id);
    } else {
      buySelected();
    }
  } else if (code === 'Enter' || code === 'Space') {
    activate(btns[focus].id);
  } else if (
    code === 'Escape' &&
    (scene === SCENE_SHOP ||
      scene === SCENE_PAUSE ||
      scene === SCENE_SCORES ||
      (scene === SCENE_DEATH && deathReady()))
  ) {
    if (scene === SCENE_PAUSE) {
      resumeGame();
    } else {
      goTitle();
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
    if (charge > 0) {
      const bw = Math.min(220, cssW * 0.42);
      const bh = 10;
      const bx = cssW * 0.5 - bw * 0.5;
      const by = 120;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, bx, by, bw, bh, 5);
      ctx.fill();
      const fillW = bw * (charge / CHARGE_DIST);
      if (fillW > 1) {
        ctx.fillStyle = '#7ef';
        roundRect(ctx, bx, by, fillW, bh, 5);
        ctx.fill();
      }
    }
  }

  if (scene === SCENE_TITLE) {
    const title = 'RAINBOW RUN';
    const titleSize = Math.min(72, cssW * 0.12);
    const titleY = cssH * 0.18 - 50;
    const titleW = titleWidth(ctx, title, titleSize);
    const titleL = cssW * 0.5 - titleW * 0.5;
    const titleR = titleL + titleW;
    rainbowTitle(ctx, title, titleY, titleSize);
    drawSaveStats(ctx, titleL, titleR, titleY + titleSize * 0.5 + 36);
  }

  if (scene === SCENE_SCORES) {
    plate(ctx, 'HIGH SCORES', cssW * 0.5, cssH * 0.08, 28, 'center');
    drawScoreBoard(ctx);
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
    rainbowTitle(ctx, 'RUN OVER', cssH * 0.08, Math.min(44, cssW * 0.08));
    const { l, r } = scoreBox();
    drawSaveStats(ctx, l, r, cssH * 0.155, 1);
    drawScoreBoard(ctx);
    if (deathReady() && focus === 0 && btns.length > 1 && document.activeElement !== nameField) {
      focus = 1;
    }
  }

  if (scene !== SCENE_RUN) {
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const on = scene === SCENE_SHOP && b.id < SHOP_ROWS ? b.id === shopSel : i === focus;
      drawBtn(ctx, b, on);
    }
  }
  syncNameField();
}
