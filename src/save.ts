export const SHOP_NAMES = [
  'SPEED',
  'JUMP',
  'MAGNET',
  'SHIELD',
  'HEALTH',
  'WINGS',
  'X-JUMP',
  'X-SLIDE',
];
export const SHOP_FLAVOR = [
  'Speed: Start out faster!',
  'Jump: Jump higher and higher!',
  'Magnet: Picks up crystals from farther away!',
  'Shield: Increase chance to find shields, prevent a collision!',
  'Health: Increase chance to find hearts, start with +1 life!',
  'Wings: Increase chance to find wings, save you from falling!',
  'X-Jump: Slide while jumping to land early!',
  'X-Slide: Jump while sliding to stand early!',
];
export const SHOP_ROWS = SHOP_NAMES.length;
export const SHOP_CAPS = [3, 3, 3, 3, 3, 3, 1, 1];
export const SHOP_PRICES = [250, 250, 499, 499, 499, 499, 999, 999];

export const shopRanks = [0, 0, 0, 0, 0, 0, 0, 0];
export let banked = 0;
export let best = 0;
export let muted = false;

const KEY = 'rr';

export function shopCap(row: number): number {
  return SHOP_CAPS[row];
}

export function loadSave(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return;
    }
    const data = JSON.parse(raw) as {
      c?: number;
      b?: number;
      r?: number[];
      m?: boolean;
      v?: number;
    };
    banked = (data.c ?? 0) | 0;
    best = (data.b ?? 0) | 0;
    muted = !!data.m;
    const ranks = data.r;
    if (Array.isArray(ranks)) {
      const src: number[] = [];
      const skipValue = ranks.length !== SHOP_ROWS;
      for (let i = 0; i < SHOP_ROWS; i++) {
        src[i] = (ranks[skipValue && i > 0 ? i + 1 : i] ?? 0) | 0;
      }
      const to = data.v === 2 ? null : [2, 0, 1, 6, 7, 3, 4, 5];
      for (let i = 0; i < SHOP_ROWS; i++) {
        const dest = to ? to[i] : i;
        shopRanks[dest] = Math.max(0, Math.min(SHOP_CAPS[dest], src[i]));
      }
    }
  } catch {
    // private mode / corrupt
  }
}

export function saveGame(): void {
  localStorage.setItem(KEY, JSON.stringify({ c: banked, b: best, r: shopRanks, m: muted, v: 2 }));
}

export function setMuted(value: boolean): void {
  muted = value;
  saveGame();
}

export function addBank(amount: number): void {
  banked += amount;
  saveGame();
}

export function noteBest(distance: number): boolean {
  if (distance > best) {
    best = distance;
    saveGame();
    return true;
  }
  return false;
}

export function shopPrice(row: number): number {
  if (shopRanks[row] >= SHOP_CAPS[row]) {
    return 0;
  }
  return SHOP_PRICES[row];
}

export function tryBuy(row: number): boolean {
  const price = shopPrice(row);
  if (!price || banked < price) {
    return false;
  }
  banked -= price;
  shopRanks[row]++;
  saveGame();
  return true;
}

export function startSpeedBonus(): number {
  return shopRanks[0] * 1.6;
}

export function jumpBonus(): number {
  return 1 + 0.12 * shopRanks[1];
}

/** 0 = off, 1 = current lane, 2 = adjacent, 3 = all lanes. */
export function magnetReach(): number {
  return shopRanks[2];
}

export function shieldRank(): number {
  return shopRanks[3];
}

export function healthRank(): number {
  return shopRanks[4];
}

export function wingsRank(): number {
  return shopRanks[5];
}

export function canCancelJump(): boolean {
  return shopRanks[6] > 0;
}

export function canCancelSlide(): boolean {
  return shopRanks[7] > 0;
}
