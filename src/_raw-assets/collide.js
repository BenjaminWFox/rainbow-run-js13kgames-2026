// A sound-effect pack exported by Voxby.
//
//   import pack, { COLLIDE, POWERUP } from './sounds/thispack.js';
//   import { expandPack } from './core/sfxpack.js';
//   import { initAudio, playSound } from './core/utils.js';
//
//   const sfx = initAudio(expandPack(pack));
//   playSound(sfx[COLLIDE]);
//
// Each entry is [rowLen, patternLen, instrument, notes]; core/sfxpack.js
// expands one back into a song the player can render.

export const COLLIDE = 0;
export const POWERUP = 1;
export const EXPLOSION = 2;
export const EXPLOSION_2 = 3;
export const FALL = 4;
export const WINGSAVE = 5;

export default [
  /* obstacle-collision */ [2646, 6, [2,167,109,76,1,111,119,72,80,107,0,15,61,24,0,0,0,0,0,0,2,174,243,49,114,0,0,0,0,], [147]],
  /* fall-off-path */ [3793, 28, [0,121,97,0,0,0,101,0,0,185,0,29,160,24,0,0,0,195,1,1,2,30,236,7,77,0,0,0,0,], [147]],
  /* fall-wings-save */ [3793, 36, [0,121,97,62,0,0,108,0,0,121,176,29,45,24,0,0,0,195,1,1,2,30,199,40,77,0,0,0,0,], [147]],
];
