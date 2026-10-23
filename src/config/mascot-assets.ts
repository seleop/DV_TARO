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
    "frameW": 318,
    "frameH": 512,
    "bytes": 392836
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 279638
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 416488
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 270144
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 411016
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 271514
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 344762
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 558124
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 586816
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 496972
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 440440
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 473220
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 304520
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 383382
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 647014
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 466370
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 489202
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 327020
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 408114
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 718188
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 447178
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 462386
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 309906
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 392394
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
    "frameW": 318,
    "frameH": 512,
    "bytes": 724510
  }
};
