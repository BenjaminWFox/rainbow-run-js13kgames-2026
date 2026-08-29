import { yawAt } from './path';
import { addCrystals, dying, falling, iframes, lane, lives, s, slide, speed, y } from './player';
import { scene } from './ui';
import { burstCount } from './world';

export function initDebug(): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') {
      addCrystals(25);
    }
  });
}

export function frame(): void {
  if (!import.meta.env.DEV) {
    return;
  }
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
  };
}
