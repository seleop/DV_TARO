// scripts/mascot/encode.mjs 가 생성한다. 직접 고치지 말 것.
// 마스코트 "복이" 스프라이트 시트 정보 (docs/MASCOT.md)
export type MascotState = "idle" | "walk" | "think" | "happy" | "wave" | "nod" | "surprised" | "reveal" | "celebrate" | "yawn" | "saju-idle" | "saju-wave" | "saju-nod" | "saju-surprised" | "saju-read" | "tarot-idle" | "tarot-wave" | "tarot-nod" | "tarot-surprised" | "tarot-draw" | "star-idle" | "star-wave" | "star-nod" | "star-surprised" | "star-stargaze";
export type MascotOutfit = "default" | "saju" | "tarot" | "star";

export type MascotSheet = {
  src: string;
  outfit: MascotOutfit;
  /** 의상과 상관없는 동작 이름 (idle, wave, read 등) */
  state: string;
  frames: number;
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
  /** 한 칸 크기(px). 캐릭터 주변 여백을 잘라 낸 크기라 정사각형이 아니다 */
  frameW: number;
  frameH: number;
  bytes: number;
};

export const MASCOT_POSTER = "/mascot/poster.webp";

export const MASCOT_POSTERS: Record<MascotOutfit, string> = {
  "default": "/mascot/poster.webp",
  "saju": "/mascot/poster-saju.webp",
  "tarot": "/mascot/poster-tarot.webp",
  "star": "/mascot/poster-star.webp"
};

export const MASCOT_SHEETS: Record<MascotState, MascotSheet> = {
  "idle": {
    "src": "/mascot/idle.webp",
    "outfit": "default",
    "state": "idle",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 15,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 268822
  },
  "walk": {
    "src": "/mascot/walk.webp",
    "outfit": "default",
    "state": "walk",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 198718
  },
  "think": {
    "src": "/mascot/think.webp",
    "outfit": "default",
    "state": "think",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 15,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 297170
  },
  "happy": {
    "src": "/mascot/happy.webp",
    "outfit": "default",
    "state": "happy",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 185850
  },
  "wave": {
    "src": "/mascot/wave.webp",
    "outfit": "default",
    "state": "wave",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 287138
  },
  "nod": {
    "src": "/mascot/nod.webp",
    "outfit": "default",
    "state": "nod",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 188496
  },
  "surprised": {
    "src": "/mascot/surprised.webp",
    "outfit": "default",
    "state": "surprised",
    "frames": 24,
    "cols": 6,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 244194
  },
  "reveal": {
    "src": "/mascot/reveal.webp",
    "outfit": "default",
    "state": "reveal",
    "frames": 40,
    "cols": 8,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 390826
  },
  "celebrate": {
    "src": "/mascot/celebrate.webp",
    "outfit": "default",
    "state": "celebrate",
    "frames": 40,
    "cols": 8,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 408430
  },
  "yawn": {
    "src": "/mascot/yawn.webp",
    "outfit": "default",
    "state": "yawn",
    "frames": 36,
    "cols": 9,
    "rows": 4,
    "fps": 18,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 349338
  },
  "saju-idle": {
    "src": "/mascot/saju-idle.webp",
    "outfit": "saju",
    "state": "idle",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 15,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 296520
  },
  "saju-wave": {
    "src": "/mascot/saju-wave.webp",
    "outfit": "saju",
    "state": "wave",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 316142
  },
  "saju-nod": {
    "src": "/mascot/saju-nod.webp",
    "outfit": "saju",
    "state": "nod",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 207946
  },
  "saju-surprised": {
    "src": "/mascot/saju-surprised.webp",
    "outfit": "saju",
    "state": "surprised",
    "frames": 24,
    "cols": 6,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 264846
  },
  "saju-read": {
    "src": "/mascot/saju-read.webp",
    "outfit": "saju",
    "state": "read",
    "frames": 44,
    "cols": 9,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 425680
  },
  "tarot-idle": {
    "src": "/mascot/tarot-idle.webp",
    "outfit": "tarot",
    "state": "idle",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 15,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 318380
  },
  "tarot-wave": {
    "src": "/mascot/tarot-wave.webp",
    "outfit": "tarot",
    "state": "wave",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 335128
  },
  "tarot-nod": {
    "src": "/mascot/tarot-nod.webp",
    "outfit": "tarot",
    "state": "nod",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 225284
  },
  "tarot-surprised": {
    "src": "/mascot/tarot-surprised.webp",
    "outfit": "tarot",
    "state": "surprised",
    "frames": 24,
    "cols": 6,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 286166
  },
  "tarot-draw": {
    "src": "/mascot/tarot-draw.webp",
    "outfit": "tarot",
    "state": "draw",
    "frames": 44,
    "cols": 9,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 496320
  },
  "star-idle": {
    "src": "/mascot/star-idle.webp",
    "outfit": "star",
    "state": "idle",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 15,
    "loop": true,
    "frameW": 266,
    "frameH": 448,
    "bytes": 307242
  },
  "star-wave": {
    "src": "/mascot/star-wave.webp",
    "outfit": "star",
    "state": "wave",
    "frames": 30,
    "cols": 6,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 322490
  },
  "star-nod": {
    "src": "/mascot/star-nod.webp",
    "outfit": "star",
    "state": "nod",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 215138
  },
  "star-surprised": {
    "src": "/mascot/star-surprised.webp",
    "outfit": "star",
    "state": "surprised",
    "frames": 24,
    "cols": 6,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 273898
  },
  "star-stargaze": {
    "src": "/mascot/star-stargaze.webp",
    "outfit": "star",
    "state": "stargaze",
    "frames": 44,
    "cols": 9,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameW": 266,
    "frameH": 448,
    "bytes": 511002
  }
};
