/**
 * 브랜드·대표 캐릭터 설정.
 *
 * 캐릭터 이미지를 넣는 방법
 *  1) 배경이 투명한 PNG/WebP를 public/character/ 에 넣는다 (권장 크기 정사각형 1024px 이상).
 *  2) 아래 character.images 의 경로를 채운다. 비워 두면 기본 플레이스홀더 캐릭터가 그려진다.
 *  3) 화면마다 다른 포즈를 쓰고 싶으면 pose별 경로를 채운다 (없으면 default를 쓴다).
 */
export const BRAND = {
  appName: "운세 노트",
  /** 화면 문구에 쓰이는 캐릭터 이름. 예: "행운의 고양이가 ○○님의 운세를 점쳐봤대요" */
  characterName: "행운의 별토끼",
  character: {
    images: {
      default: null as string | null, // 예: "/character/main.png"
      thinking: null as string | null, // 결과를 기다리는 동안
      happy: null as string | null, // 결과 화면
      tarot: null as string | null,
      star: null as string | null,
    },
    alt: "대표 캐릭터",
  },
} as const;

export type CharacterPose = keyof typeof BRAND.character.images;
