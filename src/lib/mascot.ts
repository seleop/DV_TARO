/**
 * 3D 마스코트 "복이" 스프라이트 재생 규칙 (화면 없이 테스트할 수 있는 순수 로직).
 * 에셋 정보는 src/config/mascot-assets.ts (scripts/mascot/encode.mjs 가 생성).
 */
import type { MascotSheet, MascotState } from "@/config/mascot-assets";
import type { Mood, Scene } from "./character";

/** 경과 시간(ms) → 보여 줄 프레임. 반복하지 않으면 마지막 프레임에서 멈춘다 */
export function frameAt(elapsedMs: number, sheet: Pick<MascotSheet, "frames" | "fps">, loop: boolean) {
  const f = Math.floor((Math.max(0, elapsedMs) * sheet.fps) / 1000);
  return loop ? f % sheet.frames : Math.min(f, sheet.frames - 1);
}

/** 반복하지 않는 동작이 끝나는 시간(ms) */
export function durationMs(sheet: Pick<MascotSheet, "frames" | "fps">) {
  return (sheet.frames * 1000) / sheet.fps;
}

/** 프레임 → CSS background-position (%). background-size 는 (cols×100%) (rows×100%) */
export function framePosition(frame: number, sheet: Pick<MascotSheet, "cols" | "rows">) {
  const col = frame % sheet.cols;
  const row = Math.floor(frame / sheet.cols);
  const x = sheet.cols > 1 ? (col / (sheet.cols - 1)) * 100 : 0;
  const y = sheet.rows > 1 ? (row / (sheet.rows - 1)) * 100 : 0;
  return `${x}% ${y}%`;
}

/**
 * 화면 장면·운세 결과 → 마스코트 동작.
 * 점치는 중에는 복을 찾아 걸어가고, 좋은 결과에는 기뻐하고, 나머지는 편히 서 있다.
 */
export function mascotStateFor(scene: Scene, mood?: Mood | null): MascotState {
  if (mood === "great" || mood === "good") return "happy";
  if (mood) return "idle";
  if (scene === "thinking") return "walk";
  if (scene === "happy") return "happy";
  return "idle";
}
