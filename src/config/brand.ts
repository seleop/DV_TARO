import type { Expression } from "@/lib/character";

/**
 * 브랜드·대표 캐릭터 설정.
 *
 * 캐릭터 이미지를 넣는 방법
 *  1) 배경이 투명한 PNG/WebP를 public/character/ 에 넣는다 (정사각형 1024px 이상, 모든 표정의 크기·위치를 같게).
 *  2) 아래 character.images 에 표정별 경로를 채운다. neutral 이 비어 있으면 기본(임시) 캐릭터가 그려진다.
 *  3) 없는 표정은 neutral 이미지로 대신한다. 움직임(점프·흔들기 등)은 코드가 입히므로 표정 그림만 있으면 된다.
 *
 * 표정 목록 (src/lib/character.ts)
 *  neutral 기본 · blink 눈 감음(깜빡임) · happy 웃음 · excited 신남(대길)
 *  calm 차분(눈 감고 미소) · thinking 생각 중 · worried 걱정(다독임) · surprised 놀람 · sleepy 하품
 */
export const BRAND = {
  appName: "운세 노트",
  /** 화면 문구에 쓰이는 캐릭터 이름. 예: "행운의 고양이가 ○○님의 운세를 점쳐봤대요" */
  characterName: "복이",
  character: {
    /**
     * 화면에 쓰는 캐릭터
     *  mascot3d: 3D 마스코트 복이 (public/mascot, docs/MASCOT.md). 불러오기 실패 시 svg 로 대체
     *  svg: 코드로 그린 별토끼 (장면별 소품·표정 포함)
     */
    renderer: "mascot3d" as "mascot3d" | "svg",
    /** 3D 마스코트 확대 배율 (캐릭터 갤러리의 "크기 시안"에서 비교) */
    mascotZoom: 1,
    // 예: neutral: "/character/neutral.png", blink: "/character/blink.png"
    images: {} as Partial<Record<Expression, string>>,
    alt: "마스코트 복이",
  },
};
