// SFX pack exported by Voxby. Each entry is [patternLen, instrument, rowLen?].
// Note [147] is shared. rowLen defaults to 2646.

export const PICKUP = 0;
export const POWERUP = 1;
export const SLIDE = 2;
export const ENEMY_HIT = 3;
export const JUMP = 4;
export const LANE = 5;
export const FALL = 6;
export const WINGSAVE = 7;

export type SfxEntry = [number, number[], number?];

const pack: SfxEntry[] = [
  /* PICKUP */ [
    11,
    [
      3, 154, 150, 0, 3, 14, 151, 9, 0, 0, 0, 14, 69, 36, 87, 4, 0, 0, 0, 0, 2, 182, 52, 0, 29, 0,
      0, 55, 1,
    ],
  ],
  /* POWERUP */ [
    26,
    [
      1, 149, 124, 0, 1, 152, 136, 2, 0, 0, 12, 41, 104, 32, 87, 3, 0, 0, 0, 0, 2, 224, 32, 0, 16,
      0, 0, 119, 1,
    ],
  ],
  /* SLIDE */ [
    19,
    [
      0, 176, 105, 0, 0, 0, 96, 44, 0, 134, 45, 62, 34, 0, 0, 0, 0, 0, 0, 0, 2, 53, 42, 0, 21, 0, 3,
      36, 4,
    ],
  ],
  /* ENEMY_HIT */ [
    6,
    [
      2, 167, 109, 76, 1, 111, 119, 72, 80, 107, 0, 15, 61, 24, 0, 0, 0, 0, 0, 0, 2, 174, 243, 49,
      255, 0, 0, 0, 0,
    ],
  ],
  /* JUMP */ [
    7,
    [
      3, 208, 134, 60, 0, 0, 128, 0, 0, 0, 32, 6, 23, 17, 0, 0, 0, 0, 0, 0, 2, 166, 35, 13, 47, 0, 0,
      13, 2,
    ],
  ],
  /* LANE */ [
    3,
    [
      3, 237, 106, 156, 0, 0, 106, 0, 0, 98, 22, 18, 30, 1, 0, 0, 0, 0, 0, 0, 2, 37, 71, 1, 36, 0,
      0, 0, 0,
    ],
  ],
  /* FALL */ [
    28,
    [
      0, 121, 97, 0, 0, 0, 101, 0, 0, 185, 0, 29, 160, 24, 0, 0, 0, 195, 1, 1, 2, 30, 236, 7, 77, 0,
      0, 0, 0,
    ],
    3793,
  ],
  /* WINGSAVE */ [
    36,
    [
      0, 121, 97, 62, 0, 0, 108, 0, 0, 121, 176, 29, 45, 24, 0, 0, 0, 195, 1, 1, 2, 30, 199, 40, 77,
      0, 0, 0, 0,
    ],
    3793,
  ],
];

export default pack;

export function expandSfx(entry: SfxEntry) {
  return {
    songData: [{ i: entry[1], p: [1], c: [{ n: [147], f: [] }] }],
    rowLen: entry[2] || 2646,
    patternLen: entry[0],
    endPattern: 0,
    numChannels: 1,
  };
}
