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
import { beginFrame, initGl, projectScreen, resizeGl, setDrawAlpha, setSky } from './gl';
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
import { initMusic, syncMusic } from './music';
import { pathFrame, pathT } from './path';
import {
  dying,
  falling,
  iframes,
  inputLocked,
  lives,
  resetPlayer,
  s,
  splay,
  swoop,
  tryJump,
  tryLane,
  trySlide,
  updatePlayer,
  visLaneX,
  visY,
} from './player';
import { drawRoad } from './road';
import { drawStars, updateStars } from './stars';
import { initLadder } from './ladder';
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
  SCENE_SCORES,
  SCENE_SHOP,
  SCENE_TITLE,
  scene,
  setTitleHoofY,
  setViewSize,
} from './ui';
import { drawUnicorn } from './unicorn';
import { drawWorld, resetWorld, updateWorld } from './world';

const canvas = document.querySelector('#c') as HTMLCanvasElement;
const uiCanvas = document.querySelector('#u') as HTMLCanvasElement;
const ui = uiCanvas.getContext('2d') as CanvasRenderingContext2D;
const view = mat4();
const hoof = [0, 0, 0];

let decoS = 0;
let onMenu = true;
let last = 0;
let debug: typeof import('./debug') | undefined;

function viewSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  if (vv) {
    return { w: vv.width, h: vv.height };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { w, h } = viewSize();
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
  return onMenu ? decoS : s;
}

function renderWorld(): void {
  const cs = camS();
  pathFrame(cs, 0, 0, 0, hoof);
  const px = hoof[0];
  const pz = hoof[2];
  const tx = pathT[0];
  const tz = pathT[2];
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
  drawStars(view);
  if (scene === SCENE_RUN || scene === SCENE_PAUSE || scene === SCENE_DEATH) {
    drawWorld(view);
  }
  const fading = dying > 0 || (lives <= 0 && !onMenu);
  const hide =
    !fading &&
    !falling &&
    !swoop &&
    scene === SCENE_RUN &&
    iframes > 0 &&
    ((iframes * 8) | 0) % 2 === 0;
  if (!hide) {
    const ux = onMenu ? 0 : visLaneX();
    const uy = onMenu ? 0 : visY();
    const spl = onMenu ? 0 : splay;
    if (fading) {
      setDrawAlpha(Math.max(0, dying / DEATH_HOLD));
    }
    drawUnicorn(view, ux, uy, cs, spl);
    if (fading) {
      setDrawAlpha(1);
    }
  }
  if (scene === SCENE_TITLE) {
    pathFrame(cs, 0, 0, -0.55, hoof);
    projectScreen(view, hoof[0], hoof[1], hoof[2], canvas.clientWidth, canvas.clientHeight, hoof);
    setTitleHoofY(hoof[1]);
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

  const menu = scene === SCENE_TITLE || scene === SCENE_SHOP || scene === SCENE_SCORES;
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
  updateStars(dt, camS());
  syncMusic(scene === SCENE_RUN, scene === SCENE_PAUSE, dt);

  debug?.frame();
  renderWorld();
  drawUi(ui);
  debug?.drawFeel(ui);
  clearFrameInput();
}

async function main(): Promise<void> {
  loadSave();
  initLadder();
  initGl(canvas);
  setSky(SKY_R, SKY_G, SKY_B);
  initInput(uiCanvas);
  initMusic();
  resetPlayer();
  resetWorld();
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  resize();
  if (import.meta.env.DEV) {
    debug = await import('./debug');
    debug.initDebug();
  }
  requestAnimationFrame(frame);
}

main();
