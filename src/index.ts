import {
  CAM_BACK,
  CAM_HEIGHT,
  CAM_LOOK,
  CAM_LOOK_Y,
  DEATH_HOLD,
  SKY_B,
  SKY_G,
  SKY_R,
} from './constants';
import { beginFrame, initGl, resizeGl, setDrawAlpha, setSky } from './gl';
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
import { pointOnPath, tangent } from './path';
import {
  dying,
  falling,
  iframes,
  inputLocked,
  lives,
  poseSplay,
  resetPlayer,
  s,
  tryJump,
  tryLane,
  trySlide,
  updatePlayer,
  visLaneX,
  visY,
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
let onMenu = true;
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
  const c = pointOnPath(cs);
  const px = c[0];
  const pz = c[2];
  const tan = tangent(cs);
  const tx = tan[0];
  const tz = tan[2];
  lookAt(
    view,
    px - tx * CAM_BACK,
    CAM_HEIGHT,
    pz - tz * CAM_BACK,
    px + tx * CAM_LOOK,
    CAM_LOOK_Y,
    pz + tz * CAM_LOOK,
    0,
    1,
    0
  );
  beginFrame();
  drawRoad(view, cs);
  if (scene === SCENE_RUN || scene === SCENE_PAUSE || scene === SCENE_DEATH) {
    drawWorld(view);
  }
  const fading = dying > 0 || (lives <= 0 && scene !== SCENE_TITLE && scene !== SCENE_SHOP);
  const hide =
    !fading && !falling && scene === SCENE_RUN && iframes > 0 && ((iframes * 8) | 0) % 2 === 0;
  if (!hide) {
    const ux = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : visLaneX();
    const uy = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : visY();
    const spl = scene === SCENE_TITLE || scene === SCENE_SHOP ? 0 : poseSplay();
    if (fading) {
      setDrawAlpha(Math.max(0, dying / DEATH_HOLD));
    }
    drawUnicorn(view, ux, uy, cs, spl);
    if (fading) {
      setDrawAlpha(1);
    }
  }
}

function runInput(): void {
  if (wasPressed('KeyP') || wasPressed('Escape')) {
    pauseGame();
    return;
  }
  if (inputLocked() && dying > 0) {
    return;
  }
  // Screen-left is +normal (lane +1). Chase cam looks along the tangent.
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

  const menu = scene === SCENE_TITLE || scene === SCENE_SHOP;
  if (scene === SCENE_RUN) {
    runInput();
    updatePlayer(dt);
    updateWorld(dt);
    if (lives <= 0 && dying <= 0) {
      finishRun(true);
    }
  } else {
    menuKeys();
    if (menu) {
      if (!onMenu) {
        decoS = 0;
      }
      decoS += 6 * dt;
    }
  }
  onMenu = menu;

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
