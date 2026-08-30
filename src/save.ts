export const SHOP_NAMES = [
  'MAGNET',
  'JUMP',
  'CHARGE',
  'SHIELD',
  'HEALTH',
  'WINGS',
  'X-JUMP',
  'X-SLIDE',
];
export const SHOP_FLAVOR = [
  'Magnet: Picks up crystals from farther away!',
  'Jump: Jump higher and higher!',
  'Charge: Increase chance to find charges, smash a burst forward!',
  'Shield: Increase chance to find shields, prevent a collision!',
  'Health: Increase chance to find hearts, raise your max lives!',
  'Wings: Increase chance to find wings, save you from falling!',
  'X-Jump: Slide while jumping to land early!',
  'X-Slide: Jump while sliding to stand early!',
];
export const SHOP_ROWS = SHOP_NAMES.length;
export const SHOP_CAPS = [3, 3, 3, 3, 3, 3, 1, 1];
export const SHOP_PRICES = [125, 125, 250, 250, 250, 250, 499, 499];

export const shopRanks = [0, 0, 0, 0, 0, 0, 0, 0];
export let banked = 0;
export let best = 0;
export let muted = false;
export let playerId = '';
export let playerName = '';

const KEY = 'rr';
export const NAME_MAX = 13;

function newPlayerId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < bytes.length; i++) {
    id += bytes[i].toString(16).padStart(2, '0');
  }
  return id.toUpperCase();
}

export function playerLabel(): string {
  return playerName || playerId;
}

export function setPlayerName(raw: string): void {
  playerName = raw.replace(/[^\w\- ]+/g, '').trim().slice(0, NAME_MAX);
  saveGame();
}

export function loadSave(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as {
        c?: number;
        b?: number;
        r?: number[];
        m?: boolean;
        v?: number;
        i?: string;
        n?: string;
      };
      banked = (data.c ?? 0) | 0;
      best = (data.b ?? 0) | 0;
      muted = !!data.m;
      playerId = data.i && data.i.length ? data.i : '';
      playerName = data.n ? String(data.n).slice(0, NAME_MAX) : '';
      const ranks = data.r;
      if (Array.isArray(ranks)) {
        if ((data.v ?? 1) < 2) {
          shopRanks[0] = clampRank(0, ranks[2]);
          shopRanks[1] = clampRank(1, ranks[1]);
          shopRanks[2] = 0;
          for (let i = 3; i < SHOP_ROWS; i++) {
            shopRanks[i] = clampRank(i, ranks[i]);
          }
          saveGame();
        } else {
          for (let i = 0; i < SHOP_ROWS; i++) {
            shopRanks[i] = clampRank(i, ranks[i]);
          }
        }
      }
    }
  } catch {
    // private mode / corrupt
  }
  if (!playerId) {
    playerId = newPlayerId();
    saveGame();
  }
}

function clampRank(row: number, n: number | undefined): number {
  return Math.max(0, Math.min(SHOP_CAPS[row], (n ?? 0) | 0));
}

function saveGame(): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({ v: 2, c: banked, b: best, r: shopRanks, m: muted, i: playerId, n: playerName })
  );
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

export function jumpBonus(): number {
  return 1 + 0.12 * shopRanks[1];
}

/** 0 = off, 1 = current lane, 2 = adjacent, 3 = all lanes. */
export function magnetReach(): number {
  return shopRanks[0];
}

export function chargeRank(): number {
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
