import {
  COYOTE,
  FONT,
  JUMP_BUF,
  JUMP_VEL,
  resetFeel,
  setFeel,
  SLIDE_TIME,
} from './constants';
import { yawAt } from './path';
import {
  addCrystals,
  dying,
  falling,
  feelLive,
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
import { burstCount } from './world';

let showFeel = true;

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
    if (e.code === 'Digit0') {
      resetFeel();
    }
    if (e.code === 'Digit1') {
      setFeel({ coyote: COYOTE - 0.01 });
    }
    if (e.code === 'Digit2') {
      setFeel({ coyote: COYOTE + 0.01 });
    }
    if (e.code === 'Digit3') {
      setFeel({ jumpBuf: JUMP_BUF - 0.01 });
    }
    if (e.code === 'Digit4') {
      setFeel({ jumpBuf: JUMP_BUF + 0.01 });
    }
    if (e.code === 'Digit5') {
      setFeel({ slide: SLIDE_TIME - 0.05 });
    }
    if (e.code === 'Digit6') {
      setFeel({ slide: SLIDE_TIME + 0.05 });
    }
    if (e.code === 'Digit7') {
      setFeel({ jumpVel: JUMP_VEL - 0.5 });
    }
    if (e.code === 'Digit8') {
      setFeel({ jumpVel: JUMP_VEL + 0.5 });
    }
  });
}

export function frame(): void {
  const live = feelLive();
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
    bursts: burstCount(),
    y,
    slide,
    tryJump,
    trySlide,
    feel: {
      coyote: COYOTE,
      jumpBuf: JUMP_BUF,
      slide: SLIDE_TIME,
      jumpVel: JUMP_VEL,
      live,
      set: setFeel,
      reset: resetFeel,
    },
  };
}

export function drawFeel(ctx: CanvasRenderingContext2D): void {
  if (!showFeel) {
    return;
  }
  const live = feelLive();
  const lines = [
    'FEEL  F3 hide   0 reset',
    'Coyote  ' + ms(COYOTE) + '   1/2   left ' + ms(Math.max(0, live.coyote)),
    'Buffer  ' +
      ms(JUMP_BUF) +
      '   3/4   left ' +
      ms(Math.max(0, live.jumpBuf, live.slideBuf)) +
      (live.slideBuf > live.jumpBuf ? ' S' : live.jumpBuf > 0 ? ' J' : ''),
    'Slide   ' + ms(SLIDE_TIME) + '   5/6   left ' + ms(Math.max(0, live.slide)),
    'Jump v  ' + JUMP_VEL.toFixed(1) + '    7/8',
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
