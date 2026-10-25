import { randomInt } from "node:crypto";

/**
 * 타로 78장 (라이더-웨이트 체계의 카드 구성). 키워드는 이 앱에서 직접 정리한 간단한 요약이다.
 * 소수 아르카나는 "수트 주제 × 숫자/궁정 의미" 조합으로 키워드를 만든다(단순화된 체계).
 */
export interface TarotCard {
  id: string;
  nameKo: string;
  nameEn: string;
  arcana: "major" | "minor";
  upright: string[];
  reversed: string[];
}

const MAJOR: Array<[string, string, string[], string[]]> = [
  ["바보", "The Fool", ["새로운 시작", "자유", "순수한 호기심"], ["무모함", "준비 부족", "망설임"]],
  ["마법사", "The Magician", ["실행력", "재능 활용", "집중"], ["재능 낭비", "속임수", "산만함"]],
  ["여사제", "The High Priestess", ["직관", "내면의 지혜", "침묵"], ["직관 무시", "숨겨진 정보", "혼란"]],
  ["여황제", "The Empress", ["풍요", "돌봄", "창조성"], ["과잉 보호", "의존", "정체"]],
  ["황제", "The Emperor", ["질서", "책임", "리더십"], ["경직", "통제욕", "권위 갈등"]],
  ["교황", "The Hierophant", ["전통", "배움", "조언자"], ["관습 탈피", "독단", "형식주의"]],
  ["연인", "The Lovers", ["조화", "선택", "가치관의 일치"], ["불균형", "갈등하는 선택", "소통 부족"]],
  ["전차", "The Chariot", ["추진력", "의지", "승리"], ["방향 상실", "조급함", "통제력 약화"]],
  ["힘", "Strength", ["내면의 힘", "인내", "부드러운 용기"], ["자기 의심", "감정 기복", "소진"]],
  ["은둔자", "The Hermit", ["성찰", "고독", "탐구"], ["고립", "회피", "외로움"]],
  ["운명의 수레바퀴", "Wheel of Fortune", ["전환점", "흐름", "기회"], ["정체", "통제 밖의 변화", "반복"]],
  ["정의", "Justice", ["공정함", "균형", "책임"], ["불공정", "편향", "책임 회피"]],
  ["매달린 사람", "The Hanged Man", ["관점 전환", "기다림", "내려놓기"], ["지연", "무의미한 희생", "저항"]],
  ["죽음", "Death", ["끝과 새 시작", "변화", "정리"], ["변화 거부", "미련", "더딘 전환"]],
  ["절제", "Temperance", ["균형", "조율", "중용"], ["과잉", "불균형", "조급함"]],
  ["악마", "The Devil", ["집착", "유혹", "속박 인식"], ["해방", "집착에서 벗어남", "자각"]],
  ["탑", "The Tower", ["갑작스러운 변화", "깨달음", "재정비"], ["변화 회피", "불안", "늦어진 정리"]],
  ["별", "The Star", ["희망", "회복", "영감"], ["낙담", "자신감 저하", "희망을 잃음"]],
  ["달", "The Moon", ["불확실성", "상상", "무의식"], ["혼란 해소", "진실 드러남", "불안 완화"]],
  ["태양", "The Sun", ["기쁨", "성공", "활력"], ["일시적 침체", "과한 낙관", "지연된 성과"]],
  ["심판", "Judgement", ["각성", "재평가", "부름"], ["자기 비판", "결정 회피", "후회"]],
  ["세계", "The World", ["완성", "통합", "성취"], ["미완성", "마무리 부족", "지연"]],
];

const SUITS = [
  { id: "wands", ko: "완드", en: "Wands", theme: ["열정", "행동"] },
  { id: "cups", ko: "컵", en: "Cups", theme: ["감정", "관계"] },
  { id: "swords", ko: "소드", en: "Swords", theme: ["생각", "결단"] },
  { id: "pentacles", ko: "펜타클", en: "Pentacles", theme: ["현실", "재물"] },
];

const RANKS: Array<[string, string, string, string[], string[]]> = [
  ["ace", "에이스", "Ace", ["새로운 씨앗", "시작"], ["시작의 지연", "기회 놓침"]],
  ["2", "2", "Two", ["선택", "균형"], ["우유부단", "불균형"]],
  ["3", "3", "Three", ["협력", "성장"], ["엇갈림", "협력 부족"]],
  ["4", "4", "Four", ["안정", "휴식"], ["정체", "안주"]],
  ["5", "5", "Five", ["갈등", "아쉬움"], ["회복의 시작", "화해"]],
  ["6", "6", "Six", ["조화", "나눔"], ["불균형한 관계", "과거에 머묾"]],
  ["7", "7", "Seven", ["도전", "점검"], ["압박감", "방향 혼란"]],
  ["8", "8", "Eight", ["집중", "진전"], ["답보", "조급함"]],
  ["9", "9", "Nine", ["인내", "성취 직전"], ["지침", "걱정 과다"]],
  ["10", "10", "Ten", ["완결", "무게"], ["과부하", "끝맺음 지연"]],
  ["page", "시종", "Page", ["배움", "새 소식"], ["미숙함", "소식 지연"]],
  ["knight", "기사", "Knight", ["추진", "모험"], ["성급함", "방향 상실"]],
  ["queen", "여왕", "Queen", ["성숙한 돌봄", "공감"], ["감정 과잉", "자기 소홀"]],
  ["king", "왕", "King", ["리더십", "책임"], ["독단", "통제욕"]],
];

export const DECK: TarotCard[] = [
  ...MAJOR.map(([ko, en, up, rev], i) => ({ id: `major-${i}`, nameKo: ko, nameEn: en, arcana: "major" as const, upright: up, reversed: rev })),
  ...SUITS.flatMap((s) =>
    RANKS.map(([rid, rko, ren, up, rev]) => ({
      id: `${s.id}-${rid}`,
      nameKo: `${s.ko} ${rko}`,
      nameEn: `${ren} of ${s.en}`,
      arcana: "minor" as const,
      upright: [...up, ...s.theme],
      reversed: [...rev, ...s.theme],
    })),
  ),
];

export const SPREADS = {
  one: { label: "원 카드", positions: ["오늘의 메시지"] },
  three: { label: "쓰리 카드 (과거·현재·미래)", positions: ["과거", "현재", "앞으로의 흐름"] },
  choice: { label: "선택 (A·B·조언)", positions: ["선택 A", "선택 B", "조언"] },
} as const;
export type SpreadId = keyof typeof SPREADS;

export interface DrawnCard {
  id: string;
  position: string;
  nameKo: string;
  nameEn: string;
  reversed: boolean;
  keywords: string[];
}

/**
 * 서버 측 암호학적 난수로 중복 없이 카드를 뽑는다.
 * picks(사용자가 펼친 카드 중 고른 자리, 0~77, 위치 순서대로)를 주면 덱을 새로 섞은 뒤 그 자리의 카드를 준다.
 * 섞는 순서는 고른 자리와 무관한 균등 난수라, 결과 분포는 그냥 뽑을 때와 같다 (사용자는 뒷면만 보고 고른다).
 */
export function drawCards(spread: SpreadId, rand: (max: number) => number = randomInt, picks?: readonly number[]): DrawnCard[] {
  const positions = SPREADS[spread].positions;
  const toDrawn = (card: TarotCard, position: string): DrawnCard => {
    const reversed = rand(2) === 1;
    return { id: card.id, position, nameKo: card.nameKo, nameEn: card.nameEn, reversed, keywords: reversed ? card.reversed : card.upright };
  };
  if (picks) {
    if (!validPicks(spread, picks)) throw new RangeError("picks");
    const deck = shuffle(DECK, rand);
    return positions.map((position, i) => toDrawn(deck[picks[i]], position));
  }
  const pool = [...DECK];
  return positions.map((position) => toDrawn(pool.splice(rand(pool.length), 1)[0], position));
}

/** 고른 자리가 스프레드 장수만큼, 덱 범위 안에서, 겹치지 않는지 */
export function validPicks(spread: SpreadId, picks: readonly number[]) {
  return (
    picks.length === SPREADS[spread].positions.length &&
    new Set(picks).size === picks.length &&
    picks.every((p) => Number.isInteger(p) && p >= 0 && p < DECK.length)
  );
}

/** Fisher–Yates 섞기 */
function shuffle<T>(items: readonly T[], rand: (max: number) => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
