/**
 * 3D 마스코트 "별이" 스프라이트 재생·동작 선택 규칙 (화면 없이 테스트할 수 있는 순수 로직).
 * 에셋 정보는 src/config/mascot-assets.ts (scripts/mascot/encode.mjs 가 생성).
 *
 * 동작 종류
 *  - 바탕 동작(반복): idle 서 있기 · walk 걷기 · think 생각 · happy 기뻐 뛰기
 *  - 반응 동작(한 번): wave 손 흔들기 · nod 끄덕 · surprised 놀람 · reveal 카드 꺼내 보여 주기 · celebrate 점프 축하 · yawn 하품
 * 반응 동작은 휴식 자세(idle 첫 프레임)에서 시작해 휴식 자세로 끝나므로, 끝난 뒤 바탕 동작으로 자연스럽게 이어진다.
 */
import type { MascotSheet, MascotState } from "@/config/mascot-assets";
import { pickWeighted, type Mood, type Rand, type Scene } from "./character";

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
 * 화면 장면·운세 결과 → 바탕 동작(반복).
 * 점치는 중에는 복을 찾아 걷고, 타로·사주는 고민하고, 좋은 결과에는 기뻐 뛰고, 나머지는 편히 서 있다.
 */
export function mascotStateFor(scene: Scene, mood?: Mood | null): MascotState {
  if (mood === "great" || mood === "good") return "happy";
  if (mood) return "idle";
  if (scene === "thinking") return "walk";
  if (scene === "tarot" || scene === "saju") return "think";
  if (scene === "happy") return "happy";
  return "idle";
}

/** 화면에 들어왔을 때 한 번 하는 동작. 결과 화면은 결과를 소개하고, 첫 화면은 인사한다 */
export function introFor(scene: Scene, mood?: Mood | null): MascotState | null {
  if (mood === "great") return "celebrate";
  if (mood === "good") return "reveal";
  if (mood) return "nod";
  if (scene === "default") return "wave";
  // 의상 장면(사주·타로·별자리)은 대표 동작(책 읽기·카드 뽑기·별 보기)으로 시작 → resolveSheet 가 바꿔 준다
  if (scene === "happy" || scene === "star" || scene === "saju" || scene === "tarot") return "reveal";
  return null;
}

/** 터치 반응. 연타하면 놀란다 */
export function tapReactionFor(recentTaps: number, dizzyTaps: number, rand: Rand): MascotState {
  if (recentTaps >= dizzyTaps) return "surprised";
  return pickWeighted<MascotState>(
    [
      ["wave", 3],
      ["nod", 3],
      ["surprised", 1.5],
      ["reveal", 1],
      ["celebrate", 0.7],
    ],
    rand,
  );
}

/** 가만히 있을 때 가끔 하는 동작. 오래 두면 하품한다. null 이면 이번에는 아무것도 하지 않음 */
export function idleReactionFor(idleMs: number, rand: Rand): MascotState | null {
  return pickWeighted<MascotState | null>(
    [
      [null, 4],
      ["wave", 1],
      ["nod", 1],
      ["yawn", idleMs > 25_000 ? 3 : 0],
    ],
    rand,
  );
}

// ── 의상 (장면별 별이) ──
export type Outfit = "default" | "saju" | "tarot" | "star";

/** 화면 장면 → 의상. 사주는 갓·안경·사주책, 타로는 마법사 모자·망토·카드, 별자리는 베레모·목도리·망원경 */
export function outfitFor(scene: Scene): Outfit {
  if (scene === "saju" || scene === "tarot" || scene === "star") return scene;
  return "default";
}

/** 의상별 대표 동작 (기본 의상의 reveal·celebrate 자리에 쓴다) */
export const SIGNATURE: Record<Exclude<Outfit, "default">, string> = { saju: "read", tarot: "draw", star: "stargaze" };

/**
 * (의상, 기본 의상 기준 동작 이름) → 실제 시트 이름.
 * 의상 시트에 없는 동작은 가장 가까운 것으로 바꾼다: 결과 소개·축하 → 대표 동작, 하품 → 끄덕, 나머지 바탕 동작 → idle.
 * available: 존재하는 시트 이름 목록 (MASCOT_SHEETS 의 키)
 */
export function resolveSheet(outfit: Outfit, state: string, available: ReadonlySet<string>): string {
  if (outfit === "default") return available.has(state) ? state : "idle";
  const direct = `${outfit}-${state}`;
  if (available.has(direct)) return direct;
  const sig = `${outfit}-${SIGNATURE[outfit]}`;
  if ((state === "reveal" || state === "celebrate") && available.has(sig)) return sig;
  if (state === "yawn" && available.has(`${outfit}-nod`)) return `${outfit}-nod`;
  return available.has(`${outfit}-idle`) ? `${outfit}-idle` : "idle";
}

/** 다음 대기 동작까지 기다릴 시간 (9~16초) */
export function nextIdleReactionDelay(rand: Rand) {
  return 9000 + Math.floor(rand() * 7000);
}
