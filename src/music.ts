import pack, {
  ENEMY_HIT,
  expandSfx,
  FALL,
  JUMP,
  LANE,
  PICKUP,
  POWERUP,
  SLIDE,
  WINGSAVE,
} from './pickup-sfx';
import { muted } from './save';
import song, { CPlayer } from './smallplayer';

type Box = {
  init(data: unknown): void;
  generate(): number;
  createAudioBuffer(ctx: AudioContext): AudioBuffer;
};

function box(): Box {
  return new (CPlayer as unknown as { new (): Box })();
}

const player = box();
player.init(song);

const sfxPlayers = pack.map((entry) => {
  const p = box();
  p.init(expandSfx(entry));
  while (p.generate() < 1) {}
  return p;
});

let ctx: AudioContext | undefined;
let musicGain: GainNode | undefined;
let sfxGain: GainNode | undefined;
let src: AudioBufferSourceNode | undefined;
const sfxBufs: (AudioBuffer | undefined)[] = [];
let progress = 0;
let pumping = false;
let playing = false;
let runTime = 0;

function musicRate(): number {
  // 100 / 112 / 126 / 141 / 150 BPM (0, +2, +4, +6, +7 semitones)
  return 2 ** ([0, 2, 4, 6, 7][Math.min(4, (runTime / 15) | 0)] / 12);
}

function applyRate(): void {
  if (src) {
    src.playbackRate.value = musicRate();
  }
}

function pump(): void {
  if (pumping) {
    return;
  }
  pumping = true;
  const step = (): void => {
    if (progress < 1) {
      progress = player.generate();
      requestAnimationFrame(step);
      return;
    }
    pumping = false;
    if (!ctx || playing) {
      return;
    }
    playing = true;
    src = ctx.createBufferSource();
    src.buffer = player.createAudioBuffer(ctx);
    src.loop = true;
    applyRate();
    src.connect(musicGain as GainNode);
    src.start();
    applyMute();
  };
  step();
}

function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
  }
  ctx.resume();
  applyMute();
  return ctx;
}

function play(): void {
  audio();
  pump();
}

function playSfx(id: number, vol = 1): void {
  if (muted) {
    return;
  }
  const ac = audio();
  sfxBufs[id] ||= sfxPlayers[id].createAudioBuffer(ac);
  const src = ac.createBufferSource();
  src.buffer = sfxBufs[id];
  if (vol !== 1) {
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(g).connect(sfxGain as GainNode);
  } else {
    src.connect(sfxGain as GainNode);
  }
  src.start();
}

export function applyMute(): void {
  if (musicGain) {
    musicGain.gain.value = muted ? 0 : 0.25;
  }
  if (sfxGain) {
    sfxGain.gain.value = muted ? 0 : 1.25;
  }
}

export function syncMusic(running: boolean, paused: boolean, dt: number): void {
  if (running) {
    runTime += dt;
  } else if (!paused) {
    runTime = 0;
  }
  applyRate();
}

export function playCrystal(): void {
  playSfx(PICKUP);
}

export function playPowerup(): void {
  playSfx(POWERUP);
}

export function playSlide(): void {
  playSfx(SLIDE);
}

export function playHit(): void {
  playSfx(ENEMY_HIT, 2);
}

export function playJump(): void {
  playSfx(JUMP);
}

export function playLane(): void {
  playSfx(LANE);
}

export function playFall(): void {
  playSfx(FALL);
}

export function playWingSave(): void {
  playSfx(WINGSAVE);
}

export function initMusic(): void {
  pump();
  const unlock = (): void => {
    play();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
