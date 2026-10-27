/**
 * 화면(경로)별 장면 배경.
 * 기능별 밤 장면 (2026-10-25 사용자 결정, 디테일 SVG · src/components/backdrops):
 *  - 홈은 고른 메뉴 카드의 배경을 그대로 쓴다 (2026-10-25 사용자 결정: 처음부터 카드 배경, 첫 카드 = 오늘의 운세)
 *  - sanctum 타로 점술사의 성소(제단 위 수정구): 타로
 *  - dawn 새벽빛 언덕길: 오늘의 운세 (운세 보는 중에는 마스코트 걸음에 맞춰 배경이 흐름)
 *  - study 달빛 한옥 서재: 사주 목록
 *  - observatory 산꼭대기 별빛 천문대: 별자리
 * 그 밖:
 *  - garden 별빛 정원 천막: 로그인/가입 (화면은 자체 우주 배경을 쓰고, 여기서는 바탕색만)
 *  - entrance·inside: 예전 천막 일러스트 (지금 쓰는 화면 없음)
 *  - night 장면 그림 없는 밤 바탕 + 어두운 유리 카드: MY·프로필 설정·다른 사람 사주 입력·개인정보 동의
 *    (2026-10-28 사용자 결정: 밤 장면 화면들과 이어지게 크림색 대신 밤 테마로 통일)
 *  - plain 크림색 바탕: 관리자 등
 */
export type BackdropKind = "sanctum" | "dawn" | "study" | "observatory";
export type SceneKind = BackdropKind | "entrance" | "inside" | "garden" | "night" | "plain";

const BACKDROPS: ReadonlySet<SceneKind> = new Set<BackdropKind>(["sanctum", "dawn", "study", "observatory"]);

/** 기능별 밤 장면인지 (밝은 글씨 + 어두운 유리 시트) */
export function isBackdropKind(kind: SceneKind): kind is BackdropKind {
  return BACKDROPS.has(kind);
}

export function sceneForPath(path: string): SceneKind {
  // 홈은 HomeView 가 고른 카드의 배경을 Screen 에 넘긴다. 여기서는 첫 카드(오늘의 운세) 배경
  if (path === "/" || path.startsWith("/today")) return "dawn";
  if (path.startsWith("/tarot")) return "sanctum";
  // 사주: 목록과 대화형 결과(별이가 서재에서 풀이, 2026-10-26). 새로 입력은 입력 화면이라 크림색 바탕
  if (path === "/saju" || (path.startsWith("/saju/") && path !== "/saju/new")) return "study";
  if (path.startsWith("/horoscope")) return "observatory";
  if (path.startsWith("/login") || path.startsWith("/signup")) return "garden";
  if (path === "/me" || path.startsWith("/me/") || path === "/saju/new" || path.startsWith("/consent")) return "night";
  return "plain";
}

/** 장면 위 글자색 클래스 (globals.css 의 .scene-light / .scene-dark) */
export const SCENE_INK: Record<SceneKind, string> = {
  sanctum: "scene-dark",
  dawn: "scene-dark",
  study: "scene-dark",
  observatory: "scene-dark",
  entrance: "scene-light",
  inside: "scene-dark",
  garden: "scene-dark",
  night: "scene-dark",
  plain: "",
};

/** 화면 아래쪽(시트 뒤)을 채우는 색: 밤 장면은 유리 시트 뒤가 비치므로 어두운 색, 그 밖은 크림색(var(--bg)) */
export const SCENE_BOTTOM: Partial<Record<SceneKind, string>> = {
  sanctum: "#120e34",
  dawn: "#2a1640",
  study: "#1e1012",
  observatory: "#100e2c",
  night: "#0b0924",
};

/** 화면 맨 위(상태 표시줄 뒤)를 채우는 색 = 장면 하늘의 맨 위 색 */
export const SCENE_TOP: Record<SceneKind, string> = {
  sanctum: "#0a0424",
  dawn: "#151a5a",
  study: "#20120e",
  observatory: "#030622",
  entrance: "#ffc6a6",
  inside: "#f08a6b",
  garden: "#2f2c74",
  night: "#140d3a",
  plain: "#fff7ec",
};
