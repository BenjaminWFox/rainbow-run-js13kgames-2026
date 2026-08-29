import { COYOTE, FONT, JUMP_BUF, JUMP_VEL, SLIDE_TIME } from './constants';
import { yawAt } from './path';
import {
  addCrystals,
  dying,
  falling,
  iframes,
  lane,
  lives,
  s,
  slide,
  speed,
  tryJump,
  trySlide,
  y,
} from './player';
import { cssH, scene } from './ui';

let showFeel = false;

function ms(n: number): string {
  return ((n * 1000 + 0.5) | 0) + 'ms';
}

export function initDebug(): void {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      return;
    }
    if (e.code === 'F2') {
      addCrystals(25);
    }
    if (e.code === 'F3') {
      showFeel = !showFeel;
    }
  });
}

export function frame(): void {
  (window as unknown as { rr: unknown }).rr = {
    s,
    lane,
    lives,
    iframes,
    speed,
    yaw: yawAt(s),
    scene,
    dying,
    falling,
    y,
    slide,
    tryJump,
    trySlide,
  };
}

export function drawFeel(ctx: CanvasRenderingContext2D): void {
  if (!showFeel) {
    return;
  }
  const lines = [
    'FEEL  F3 hide',
    'Coyote  ' + ms(COYOTE),
    'Buffer  ' + ms(JUMP_BUF),
    'Slide   ' + ms(SLIDE_TIME),
    'Jump v  ' + JUMP_VEL.toFixed(1),
  ];
  ctx.save();
  ctx.font = '13px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const x = 14;
  const y0 = cssH - 18 - lines.length * 18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 8, y0 - 8, 268, lines.length * 18 + 14);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = i === 0 ? '#fff' : '#d8d4e8';
    ctx.fillText(lines[i], x, y0 + i * 18);
  }
  ctx.restore();
}
