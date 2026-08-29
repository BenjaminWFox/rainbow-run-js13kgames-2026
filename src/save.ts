export const SHOP_NAMES = [
  'MAGNET',
  'CRYSTAL VALUE',
  'START SPEED',
  'JUMP HEIGHT',
  'CANCEL JUMP',
  'CANCEL SLIDE',
  'SHIELD',
  'HEALTH',
  'WINGS',
];
export const SHOP_ROWS = SHOP_NAMES.length;
export const SHOP_CAPS = [3, 3, 3, 3, 1, 1, 3, 3, 3];
export const SHOP_CAP = 3;
export const SHOP_PRICES = [6, 14, 24];

export const shopRanks = [0, 0, 0, 0, 0, 0, 0, 0, 0];
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
    const data = JSON.parse(raw) as { c?: number; b?: number; r?: number[]; m?: boolean };
    banked = (data.c ?? 0) | 0;
    best = (data.b ?? 0) | 0;
    muted = !!data.m;
    const ranks = data.r;
    if (Array.isArray(ranks)) {
      for (let i = 0; i < SHOP_ROWS; i++) {
        shopRanks[i] = Math.max(0, Math.min(SHOP_CAPS[i], (ranks[i] ?? 0) | 0));
      }
    }
  } catch {
    // private mode / corrupt
  }
}

export function saveGame(): void {
  localStorage.setItem(KEY, JSON.stringify({ c: banked, b: best, r: shopRanks, m: muted }));
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
  const rank = shopRanks[row];
  const cap = SHOP_CAPS[row];
  if (rank >= cap) {
    return 0;
  }
  if (cap === 1) {
    return 10;
  }
  return SHOP_PRICES[rank];
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

/** 0 = off, 1 = current lane, 2 = adjacent, 3 = all lanes. */
export function magnetReach(): number {
  return shopRanks[0];
}

export function crystalValue(): number {
  return 1 + shopRanks[1];
}

export function startSpeedBonus(): number {
  return shopRanks[2] * 1.6;
}

export function jumpBonus(): number {
  return 1 + 0.12 * shopRanks[3];
}

export function canCancelJump(): boolean {
  return shopRanks[4] > 0;
}

export function canCancelSlide(): boolean {
  return shopRanks[5] > 0;
}

export function shieldRank(): number {
  return shopRanks[6];
}

export function healthRank(): number {
  return shopRanks[7];
}

export function wingsRank(): number {
  return shopRanks[8];
}
