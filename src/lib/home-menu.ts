import type { Scene } from "./character";
import { josa } from "./josa";

/**
 * 홈 메뉴 카드 (2026-10-25 사용자 결정: 좌우로 넘겨 고른다. 넘기면 마스코트가 그 메뉴 의상으로 갈아입고 말도 바뀐다).
 * 순서 = 화면 순서. pose 는 CharacterStage 장면(의상): 사주 = 갓·안경·책, 타로 = 마법사 모자, 별자리 = 베레모·망원경.
 */
export type HomeMenuId = "today" | "saju" | "tarot" | "horoscope";

export interface HomeMenuItem {
  id: HomeMenuId;
  href: string;
  emoji: string;
  title: string;
  /** 카드 설명 (마스코트 이름을 넣어 만든다) */
  sub: (mascot: string) => string;
  pose: Scene;
  /** 이 카드로 넘겼을 때 말풍선 (누르면 다음 말) */
  lines: readonly string[];
  /** 카드 빛깔 (위 → 아래 그라데이션) */
  tint: readonly [string, string];
}

export const HOME_MENUS: readonly HomeMenuItem[] = [
  {
    id: "today",
    href: "/today",
    emoji: "☀️",
    title: "오늘의 운세",
    sub: (m) => `${josa(m, "이/가")} 점쳐 둔 오늘의 흐름`,
    pose: "default",
    lines: ["오늘 하루 흐름을 점쳐 뒀어요!", "오늘은 어떤 하루일까요? 같이 봐요", "좋은 일이 생길 것 같은 예감이에요 ✨"],
    tint: ["#6a3cd0", "#2c2a8a"],
  },
  {
    id: "saju",
    href: "/saju",
    emoji: "📜",
    title: "사주 풀이",
    sub: () => "타고난 기운과 올해 흐름",
    pose: "saju",
    lines: ["타고난 기운을 같이 읽어 볼까요?", "가족·친구 사주도 볼 수 있어요", "여러 만세력으로 꼼꼼히 맞춰 봤어요"],
    tint: ["#b0602a", "#5a2a5a"],
  },
  {
    id: "tarot",
    href: "/tarot",
    emoji: "🃏",
    title: "타로",
    sub: () => "마음속 질문에 카드가 답해요",
    pose: "tarot",
    lines: ["마음속 질문을 떠올려 보세요", "카드 한 장이 답을 줄지도 몰라요", "오늘은 어떤 카드가 나올까요?"],
    tint: ["#b0307a", "#4a1a6e"],
  },
  {
    id: "horoscope",
    href: "/horoscope",
    emoji: "✨",
    title: "별자리",
    sub: () => "오늘 별들이 전하는 이야기",
    pose: "star",
    lines: ["오늘 별들이 하는 이야기를 들려줄게요", "다른 별자리도 볼 수 있어요", "망원경으로 별을 살펴볼게요 🔭"],
    tint: ["#2a6ab0", "#1e2a6a"],
  },
];

/** n번째(0부터) 말풍선. 오늘의 운세를 이미 봤으면 첫 말을 바꾼다 */
export function menuLine(item: HomeMenuItem, n: number, viewedToday: boolean): string {
  const lines = item.id === "today" && viewedToday ? ["오늘 운세 다시 볼까요?", ...item.lines.slice(1)] : item.lines;
  return lines[((n % lines.length) + lines.length) % lines.length];
}
