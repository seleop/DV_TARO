/**
 * 화면(경로)별 장면 배경 (별이네 점집, 2026-10-24 사용자 결정).
 *  - sanctum 타로 점술사의 성소(밤): 홈 (2026-10-25 사용자 결정: 배경 시안 2+6)
 *  - entrance 해질녘 천막 입구: 지금은 쓰는 화면 없음 (홈의 예전 배경)
 *  - path 별빛 오솔길: 오늘의 운세 (2026-10-24 사용자 결정, 운세 보는 중에는 별이 걸음에 맞춰 배경이 흐름)
 *  - inside 천막 안 아늑한 점집: 사주·타로
 *  - garden 별빛 정원 천막: 별자리·로그인/가입(별자리 연출과 맞춤)
 *  - plain 크림색 바탕: 그 밖의 화면 (MY·프로필·관리자 등)
 */
export type SceneKind = "sanctum" | "entrance" | "path" | "inside" | "garden" | "plain";

export function sceneForPath(path: string): SceneKind {
  if (path.startsWith("/today")) return "path";
  if (path === "/") return "sanctum";
  // 사주는 목록 화면만 (사주 결과·새로 입력은 긴 글·입력 화면이라 크림색 바탕)
  if (path === "/saju" || path.startsWith("/tarot")) return "inside";
  if (path.startsWith("/horoscope") || path.startsWith("/login") || path.startsWith("/signup")) return "garden";
  return "plain";
}

/** 장면 위 글자색 클래스 (globals.css 의 .scene-light / .scene-dark) */
export const SCENE_INK: Record<SceneKind, string> = {
  sanctum: "scene-dark",
  entrance: "scene-light",
  path: "scene-dark",
  inside: "scene-dark",
  garden: "scene-dark",
  plain: "",
};

/** 화면 아래쪽(시트 뒤)을 채우는 색: 밤 장면은 유리 시트 뒤가 비치므로 어두운 남보라, 그 밖은 크림색(var(--bg)) */
export const SCENE_BOTTOM: Partial<Record<SceneKind, string>> = {
  sanctum: "#120e34",
  path: "#120e34",
};

/** 화면 맨 위(상태 표시줄 뒤)를 채우는 색 = 장면 하늘의 맨 위 색 */
export const SCENE_TOP: Record<SceneKind, string> = {
  sanctum: "#0a0424",
  entrance: "#ffc6a6",
  path: "#141244",
  inside: "#f08a6b",
  garden: "#2f2c74",
  plain: "#fff7ec",
};
