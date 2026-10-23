/**
 * 서양 태양 별자리 (열대 황도대, 날짜 경계는 일반적으로 쓰이는 근사값).
 * 실제 태양의 별자리 진입 시각은 해마다 하루 정도 달라지므로 경계일 출생자에게는 안내 문구를 붙인다.
 */
export interface ZodiacSign {
  id: string;
  nameKo: string;
  symbol: string;
  element: "불" | "흙" | "공기" | "물";
  start: [number, number];
  traits: string[];
}

export const SIGNS: ZodiacSign[] = [
  { id: "capricorn", nameKo: "염소자리", symbol: "♑", element: "흙", start: [12, 22], traits: ["성실", "책임감", "현실적"] },
  { id: "aquarius", nameKo: "물병자리", symbol: "♒", element: "공기", start: [1, 20], traits: ["독창성", "자유", "공동체"] },
  { id: "pisces", nameKo: "물고기자리", symbol: "♓", element: "물", start: [2, 19], traits: ["공감", "상상력", "섬세함"] },
  { id: "aries", nameKo: "양자리", symbol: "♈", element: "불", start: [3, 21], traits: ["추진력", "용기", "솔직함"] },
  { id: "taurus", nameKo: "황소자리", symbol: "♉", element: "흙", start: [4, 20], traits: ["꾸준함", "안정", "감각"] },
  { id: "gemini", nameKo: "쌍둥이자리", symbol: "♊", element: "공기", start: [5, 21], traits: ["호기심", "소통", "유연함"] },
  { id: "cancer", nameKo: "게자리", symbol: "♋", element: "물", start: [6, 22], traits: ["보살핌", "정", "직관"] },
  { id: "leo", nameKo: "사자자리", symbol: "♌", element: "불", start: [7, 23], traits: ["표현력", "자신감", "너그러움"] },
  { id: "virgo", nameKo: "처녀자리", symbol: "♍", element: "흙", start: [8, 23], traits: ["분석력", "꼼꼼함", "실용"] },
  { id: "libra", nameKo: "천칭자리", symbol: "♎", element: "공기", start: [9, 23], traits: ["균형", "배려", "미적 감각"] },
  { id: "scorpio", nameKo: "전갈자리", symbol: "♏", element: "물", start: [10, 23], traits: ["집중력", "깊이", "통찰"] },
  { id: "sagittarius", nameKo: "사수자리", symbol: "♐", element: "불", start: [11, 22], traits: ["낙관", "탐험", "자유"] },
];

const key = (m: number, d: number) => m * 100 + d;

export function signFor(month: number, day: number): { sign: ZodiacSign; cuspNote: string | null } {
  const k = key(month, day);
  // start 기준 오름차순 정렬(염소자리 12/22는 연말이므로 맨 뒤로 보낸다)
  const ordered = [...SIGNS.slice(1), SIGNS[0]];
  let sign = SIGNS[0];
  for (const s of ordered) if (k >= key(s.start[0], s.start[1])) sign = s;
  // 경계일(시작일 또는 전날)
  const boundary = SIGNS.some((s) => {
    const sk = key(s.start[0], s.start[1]);
    const prev = new Date(Date.UTC(2001, s.start[0] - 1, s.start[1] - 1));
    return k === sk || k === key(prev.getUTCMonth() + 1, prev.getUTCDate());
  });
  return { sign, cuspNote: boundary ? "별자리 경계일 출생이라 출생 연도·시각에 따라 인접 별자리일 수 있습니다." : null };
}

export function signById(id: string): ZodiacSign | null {
  return SIGNS.find((s) => s.id === id) ?? null;
}

/** 화면 표시용 날짜 범위 (예: 3.21 ~ 4.19) */
export function signDateRange(sign: ZodiacSign): string {
  const idx = SIGNS.indexOf(sign);
  const next = SIGNS[(idx + 1) % SIGNS.length];
  const end = new Date(Date.UTC(2001, next.start[0] - 1, next.start[1] - 1));
  return `${sign.start[0]}.${sign.start[1]} ~ ${end.getUTCMonth() + 1}.${end.getUTCDate()}`;
}
