const pressed = new Set<string>();

export let swipe = 0;
export let tapX = -1;
export let tapY = -1;

let startX = 0;
let startY = 0;
let startId = -1;
let moved = 0;

export const SWIPE_LEFT = 1;
export const SWIPE_RIGHT = 2;
export const SWIPE_UP = 3;
export const SWIPE_DOWN = 4;

export function initInput(canvas: HTMLCanvasElement): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) {
      e.preventDefault();
    }
    if (!e.repeat) {
      pressed.add(e.code);
    }
  });

  const start = (x: number, y: number, id: number): void => {
    startX = x;
    startY = y;
    startId = id;
    moved = 0;
  };
  const move = (x: number, y: number, id: number): void => {
    if (id !== startId) {
      return;
    }
    moved = Math.max(moved, Math.hypot(x - startX, y - startY));
  };
  const end = (x: number, y: number, id: number): void => {
    if (id !== startId) {
      return;
    }
    startId = -1;
    const dx = x - startX;
    const dy = y - startY;
    if (moved < 28 && Math.hypot(dx, dy) < 28) {
      tapX = x;
      tapY = y;
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      swipe = dx > 0 ? SWIPE_RIGHT : SWIPE_LEFT;
    } else {
      swipe = dy > 0 ? SWIPE_DOWN : SWIPE_UP;
    }
  };

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // synthetic events / already captured
      }
      start(e.clientX, e.clientY, e.pointerId);
    },
    { passive: false }
  );
  canvas.addEventListener(
    'pointermove',
    (e) => {
      move(e.clientX, e.clientY, e.pointerId);
    },
    { passive: false }
  );
  canvas.addEventListener('pointerup', (e) => {
    end(e.clientX, e.clientY, e.pointerId);
  });
  canvas.addEventListener('pointercancel', () => {
    startId = -1;
  });
  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );
}

export function wasPressed(code: string): boolean {
  return pressed.has(code);
}

export function clearFrameInput(): void {
  pressed.clear();
  swipe = 0;
  tapX = -1;
  tapY = -1;
}
