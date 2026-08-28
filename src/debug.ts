import { addCrystals, iframes, lane, lives, s, speed } from './player';

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
  (window as unknown as { rr: unknown }).rr = { s, lane, lives, iframes, speed };
}
