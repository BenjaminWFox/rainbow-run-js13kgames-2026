import { CAM_BACK, CAM_HEIGHT, CAM_LOOK, CAM_LOOK_Y, SKY_B, SKY_G, SKY_R } from './constants';
import { beginFrame, initGl, resizeGl, setSky } from './gl';
import {
  clearFrameInput,
  initInput,
  SWIPE_DOWN,
  SWIPE_LEFT,
  SWIPE_RIGHT,
  SWIPE_UP,
  swipe,
  tapX,
  tapY,
  wasPressed,
} from './input';
import { lookAt, mat4 } from './math';
import { initMusic } from './music';
import { yawAt } from './path';
import {
  iframes,
  laneX,
  lives,
  poseSplay,
  resetPlayer,
  s,
  tryJump,
  tryLane,
  trySlide,
  updatePlayer,
  y,
} from './player';
import { drawRoad } from './road';
import { loadSave } from './save';
import {
  drawUi,
  finishRun,
  handleMenuKey,
  handleTap,
  pauseGame,
  resumeGame,
  SCENE_DEATH,
  SCENE_PAUSE,
  SCENE_RUN,
  SCENE_SHOP,
  SCENE_TITLE,
  scene,
  setViewSize,
} from './ui';
import { drawUnicorn } from './unicorn';
import { drawWorld, resetWorld, updateWorld } from './world';

const canvas = document.querySelector('#c') as HTMLCanvasElement;
const uiCanvas = document.querySelector('#u') as HTMLCanvasElement;
const ui = uiCanvas.getContext('2d') as CanvasRenderingContext2D;
const view = mat4();

let decoS = 0;
let last = 0;
let debug: typeof import('./debug') | undefined;

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const el of [canvas, uiCanvas]) {
    el.width = (w * dpr) | 0;
    el.height = (h * dpr) | 0;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  }
  resizeGl(canvas.width, canvas.height);
  ui.setTransform(dpr, 0, 0, dpr, 0, 0);
  setViewSize(w, h);
}

function camS(): number {
  return scene === SCENE_TITLE || scene === SCENE_SHOP ? decoS : s;
}

function renderWorld(): void {
  const cs = camS();
  const tanYaw = yawAt(cs);
  const back = CAM_BACK;
  const eyeX = Math.sin(tanYaw) * -back;
  const eyeZ = cs + Math.cos(tanYaw) * -back;
  lookAt(
    view,
    eyeX,
    CAM_HEIGHT,
    eyeZ,
    Math.sin(tanYaw) * CAM_LOOK,
    CAM_LOOK_Y,
    cs + Math.cos(tanYaw) * CAM_LOOK,
    0,
    1,
    0
  );
  beginFrame();
  drawRoad(view, cs);
  if (scene === SCENE_RUN || scene === SCENE_PAUSE || scene === SCENE_DEATH) {
    drawWorld(view);
  }
  const hide = scene === SCENE_RUN && iframes > 0 && ((iframes * 8) | 0) % 2 === 0;
  if (!hide) {
    const ux = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : laneX;
    const uy = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : y;
    const spl = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : poseSplay();
    drawUnicorn(view, ux, uy, cs, yawAt(cs), cs, spl);
  }
}

function runInput(): void {
  if (wasPressed('KeyP') || wasPressed('Escape')) {
    pauseGame();
    return;
  }
  // Chase cam looks +Z, which mirrors world X on screen — input is in screen space.
  if (swipe === SWIPE_LEFT || wasPressed('ArrowLeft') || wasPressed('KeyA')) {
    tryLane(1);
  }
  if (swipe === SWIPE_RIGHT || wasPressed('ArrowRight') || wasPressed('KeyD')) {
    tryLane(-1);
  }
  if (swipe === SWIPE_UP || wasPressed('ArrowUp') || wasPressed('KeyW') || wasPressed('Space')) {
    tryJump();
  }
  if (swipe === SWIPE_DOWN || wasPressed('ArrowDown') || wasPressed('KeyS')) {
    trySlide();
  }
}

function menuKeys(): void {
  for (const code of [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Enter',
    'Space',
    'Escape',
  ]) {
    if (wasPressed(code)) {
      handleMenuKey(code);
    }
  }
  if (scene === SCENE_PAUSE && wasPressed('KeyP')) {
    resumeGame();
  }
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (!last) {
    last = now;
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (tapX >= 0) {
    handleTap(tapX, tapY);
  }

  if (scene === SCENE_RUN) {
    runInput();
    updatePlayer(dt);
    updateWorld(dt);
    if (lives <= 0) {
      finishRun(true);
    }
  } else {
    menuKeys();
    if (scene === SCENE_TITLE || scene === SCENE_SHOP) {
      decoS += 6 * dt;
    }
  }

  debug?.frame();
  renderWorld();
  drawUi(ui);
  clearFrameInput();
}

async function main(): Promise<void> {
  loadSave();
  initGl(canvas);
  setSky(SKY_R, SKY_G, SKY_B);
  initInput(uiCanvas);
  initMusic();
  resetPlayer();
  resetWorld();
  window.addEventListener('resize', resize);
  resize();
  if (import.meta.env.DEV) {
    debug = await import('./debug');
    debug.initDebug();
  }
  requestAnimationFrame(frame);
}

main();
