// scripts/mascot/encode.mjs 가 생성한다. 직접 고치지 말 것.
// 마스코트 "복이" 스프라이트 시트 정보 (docs/MASCOT.md)
export type MascotState = "idle" | "walk" | "happy" | "surprised";

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
    "frames": 24,
    "cols": 6,
    "rows": 4,
    "fps": 12,
    "loop": true,
    "frameSize": 384,
    "bytes": 153920
  },
  "walk": {
    "src": "/mascot/walk.webp",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": true,
    "frameSize": 384,
    "bytes": 135500
  },
  "happy": {
    "src": "/mascot/happy.webp",
    "frames": 20,
    "cols": 5,
    "rows": 4,
    "fps": 20,
    "loop": true,
    "frameSize": 384,
    "bytes": 124364
  },
  "surprised": {
    "src": "/mascot/surprised.webp",
    "frames": 16,
    "cols": 4,
    "rows": 4,
    "fps": 20,
    "loop": false,
    "frameSize": 384,
    "bytes": 112448
  }
};
