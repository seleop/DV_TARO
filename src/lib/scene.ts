/**
 * 화면(경로)별 장면 배경 (별이네 점집, 2026-10-24 사용자 결정).
 *  - entrance 해질녘 천막 입구: 홈·오늘의 운세
 *  - inside 천막 안 아늑한 점집: 사주·타로
 *  - garden 별빛 정원 천막: 별자리·로그인/가입(별자리 연출과 맞춤)
 *  - plain 크림색 바탕: 그 밖의 화면 (MY·프로필·관리자 등)
 */
export type SceneKind = "entrance" | "inside" | "garden" | "plain";

export function sceneForPath(path: string): SceneKind {
  if (path === "/" || path.startsWith("/today")) return "entrance";
  // 사주는 목록 화면만 (사주 결과·새로 입력은 긴 글·입력 화면이라 크림색 바탕)
  if (path === "/saju" || path.startsWith("/tarot")) return "inside";
  if (path.startsWith("/horoscope") || path.startsWith("/login") || path.startsWith("/signup")) return "garden";
  return "plain";
}

/** 장면 위 글자색 클래스 (globals.css 의 .scene-light / .scene-dark) */
export const SCENE_INK: Record<SceneKind, string> = {
  entrance: "scene-light",
  inside: "scene-dark",
  garden: "scene-dark",
  plain: "",
};

/** 화면 맨 위(상태 표시줄 뒤)를 채우는 색 = 장면 하늘의 맨 위 색 */
export const SCENE_TOP: Record<SceneKind, string> = {
  entrance: "#ffc6a6",
  inside: "#f08a6b",
  garden: "#2f2c74",
  plain: "#fff7ec",
};
