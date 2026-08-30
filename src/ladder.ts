import { best, NAME_MAX, playerId, playerLabel } from './save';

const KEY = 'rrL';
const CAP = 20;
const MAX_SCORE = 1e6;
const WS_URL = 'wss://relay.js13kgames.com/rainbow-run';

type Row = { i: string; n: string; s: number; t: number };

let rows: Row[] = [];
let sock: { send(data: string): void; readyState: number } | undefined;
let sendAt = 0;
let sendTimer: ReturnType<typeof setTimeout> | 0 = 0;

export function initLadder(): void {
  loadBoard();
  upsertSelf();
  connect();
}

export function boardRows(limit: number): { n: string; s: number; self: boolean }[] {
  return ranked()
    .slice(0, limit)
    .map((r) => ({ n: r.n, s: r.s, self: r.i === playerId }));
}

export function publishScore(): void {
  if (best <= 0) {
    return;
  }
  upsertSelf();
  scheduleSend();
}

export function publishName(): void {
  if (best <= 0) {
    return;
  }
  upsertSelf();
  scheduleSend();
}

function loadBoard(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return;
    }
    const data = JSON.parse(raw) as { r?: unknown };
    rows = readRows(data.r);
  } catch {
    rows = [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ r: pack(ranked()) }));
  } catch {
    // private mode
  }
}

function ranked(): Row[] {
  return rows.slice().sort((a, b) => b.s - a.s || b.t - a.t);
}

function pack(list: Row[]): [string, string, number, number][] {
  return list.slice(0, CAP).map((r) => [r.i, r.n, r.s, r.t]);
}

function upsertSelf(): void {
  if (best <= 0 || !playerId) {
    return;
  }
  const n = playerLabel();
  const now = Date.now();
  const mine = rows.find((r) => r.i === playerId);
  if (mine) {
    if (best > mine.s) {
      mine.s = best;
      mine.t = now;
    }
    mine.n = n;
  } else {
    rows.push({ i: playerId, n, s: best, t: now });
  }
  persist();
}

function cleanName(raw: string): string {
  return raw.replace(/[^\w\- ]+/g, '').trim().slice(0, NAME_MAX);
}

function readRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const now = Date.now();
  const out: Row[] = [];
  const seen: Record<string, Row> = {};
  for (let i = 0; i < raw.length && out.length < CAP + 4; i++) {
    const item = raw[i];
    let id = '';
    let name = '';
    let score = 0;
    let ts = 0;
    if (Array.isArray(item)) {
      id = String(item[0] ?? '');
      name = String(item[1] ?? '');
      score = item[2] | 0;
      ts = +item[3] || 0;
    } else if (item && typeof item === 'object') {
      const o = item as Row;
      id = String(o.i ?? '');
      name = String(o.n ?? '');
      score = o.s | 0;
      ts = +o.t || 0;
    }
    id = id.replace(/[^\w\-]/g, '').slice(0, 16);
    name = cleanName(name) || id;
    if (!id || score < 1 || score > MAX_SCORE || ts < 1 || ts > now + 864e5) {
      continue;
    }
    const prev = seen[id];
    if (prev && (prev.s > score || (prev.s === score && prev.t >= ts))) {
      continue;
    }
    const row = { i: id, n: name, s: score, t: ts };
    if (prev) {
      out[out.indexOf(prev)] = row;
    } else {
      out.push(row);
    }
    seen[id] = row;
  }
  return out;
}

function merge(incoming: Row[]): boolean {
  const before = JSON.stringify(pack(ranked()));
  for (const row of incoming) {
    const prev = rows.find((r) => r.i === row.i);
    if (!prev) {
      rows.push(row);
      continue;
    }
    if (row.s > prev.s || (row.s === prev.s && row.t > prev.t)) {
      prev.s = row.s;
      prev.t = row.t;
      prev.n = row.n;
    } else if (row.s === prev.s && row.n && row.i !== playerId) {
      prev.n = row.n;
    }
  }
  upsertSelf();
  rows = ranked().slice(0, CAP);
  persist();
  return JSON.stringify(pack(ranked())) !== before;
}

function payload(): string {
  const list = ranked().slice(0, CAP);
  if (best > 0 && !list.some((r) => r.i === playerId)) {
    list.push({ i: playerId, n: playerLabel(), s: best, t: Date.now() });
  }
  return JSON.stringify({ r: pack(list) });
}

function scheduleSend(): void {
  if (sendTimer) {
    return;
  }
  const wait = Math.max(0, sendAt + 400 - Date.now());
  sendTimer = setTimeout(() => {
    sendTimer = 0;
    sendAt = Date.now();
    if (sock && sock.readyState === 1 && (best > 0 || rows.length)) {
      sock.send(payload());
    }
  }, wait);
}

function onMessage(data: string): void {
  if (data.length > 4000) {
    return;
  }
  try {
    const msg = JSON.parse(data) as { r?: unknown };
    const incoming = readRows(msg.r);
    if (incoming.length && merge(incoming)) {
      scheduleSend();
    }
  } catch {
    // ignore
  }
}

function connect(): void {
  try {
    const ws = new WebSocket(WS_URL);
    sock = ws;
    ws.addEventListener('open', () => {
      scheduleSend();
    });
    ws.addEventListener('message', (e) => {
      if (typeof e.data === 'string') {
        onMessage(e.data);
      }
    });
    ws.addEventListener('close', () => {
      if (sock === ws) {
        sock = undefined;
      }
      setTimeout(connect, 2500);
    });
    ws.addEventListener('error', () => {
      ws.close();
    });
  } catch {
    setTimeout(connect, 4000);
  }
}
