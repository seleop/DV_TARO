// scripts/mascot/encode.mjs 가 생성한다. 직접 고치지 말 것.
// 마스코트 "복이" 스프라이트 시트 정보 (docs/MASCOT.md)
export type MascotState = "idle" | "walk" | "think" | "happy" | "wave" | "nod" | "surprised" | "reveal" | "celebrate" | "yawn";

export type MascotSheet = {
  src: string;
  frames: number;
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
  frameSize: number;
  bytes: number;
};

export const MASCOT_POSTER = "/mascot/poster.webp";

export const MASCOT_SHEETS: Record<MascotState, MascotSheet> = {
  "idle": {
    "src": "/mascot/idle.webp",
    "frames": 30,
    "cols": 5,
    "rows": 6,
    "fps": 15,
    "loop": true,
    "frameSize": 384,
    "bytes": 170954
  },
  "walk": {
    "src": "/mascot/walk.webp",
    "frames": 20,
    "cols": 4,
    "rows": 5,
    "fps": 20,
    "loop": true,
    "frameSize": 384,
    "bytes": 120260
  },
  "think": {
    "src": "/mascot/think.webp",
    "frames": 30,
    "cols": 5,
    "rows": 6,
    "fps": 15,
    "loop": true,
    "frameSize": 384,
    "bytes": 179236
  },
  "happy": {
    "src": "/mascot/happy.webp",
    "frames": 20,
    "cols": 4,
    "rows": 5,
    "fps": 20,
    "loop": true,
    "frameSize": 384,
    "bytes": 118310
  },
  "wave": {
    "src": "/mascot/wave.webp",
    "frames": 30,
    "cols": 5,
    "rows": 6,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 179896
  },
  "nod": {
    "src": "/mascot/nod.webp",
    "frames": 20,
    "cols": 4,
    "rows": 5,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 116434
  },
  "surprised": {
    "src": "/mascot/surprised.webp",
    "frames": 24,
    "cols": 4,
    "rows": 6,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 148812
  },
  "reveal": {
    "src": "/mascot/reveal.webp",
    "frames": 40,
    "cols": 5,
    "rows": 8,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 240808
  },
  "celebrate": {
    "src": "/mascot/celebrate.webp",
    "frames": 40,
    "cols": 5,
    "rows": 8,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 256210
  },
  "yawn": {
    "src": "/mascot/yawn.webp",
    "frames": 36,
    "cols": 6,
    "rows": 6,
    "fps": 18,
    "loop": false,
    "frameSize": 384,
    "bytes": 212180
  }
};
