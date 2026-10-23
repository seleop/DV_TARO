/**
 * 간지 기본 상수와 표기 변환. 계산 로직이 아니라 엔진 응답을 공통 표기로 바꾸는 데만 쓴다.
 * (천간·지지의 오행 배속처럼 학파와 무관하게 고정된 대응표만 포함한다.)
 */
export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];
export type Element = "목" | "화" | "토" | "금" | "수";
export const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];

export const STEM_ELEMENT: Record<Stem, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

// 지지 키 "신"이 천간 "신"과 겹치므로 지지는 인덱스로 다룬다.
const BRANCH_ELEMENT_BY_INDEX: Element[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];

export const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;
export type TenGod = (typeof TEN_GODS)[number];

const CN_TEN_GOD: Record<string, TenGod> = {
  比肩: "비견", 劫财: "겁재", 劫財: "겁재", 食神: "식신", 伤官: "상관", 傷官: "상관",
  偏财: "편재", 偏財: "편재", 正财: "정재", 正財: "정재", 七杀: "편관", 七殺: "편관", 偏官: "편관",
  正官: "정관", 偏印: "편인", 正印: "정인",
};

export interface Pillar {
  stem: Stem;
  branch: Branch;
}

export function isStem(v: unknown): v is Stem {
  return typeof v === "string" && (STEMS as readonly string[]).includes(v);
}
export function isBranch(v: unknown): v is Branch {
  return typeof v === "string" && (BRANCHES as readonly string[]).includes(v);
}

/** "갑자" 또는 "甲子" → Pillar. 해석할 수 없으면 null. */
export function parsePillar(text: unknown): Pillar | null {
  if (typeof text !== "string") return null;
  const chars = [...text.trim()];
  if (chars.length !== 2) return null;
  const [a, b] = chars;
  const si = STEMS.indexOf(a as Stem) >= 0 ? STEMS.indexOf(a as Stem) : STEM_HANJA.indexOf(a as (typeof STEM_HANJA)[number]);
  const bi =
    BRANCHES.indexOf(b as Branch) >= 0 ? BRANCHES.indexOf(b as Branch) : BRANCH_HANJA.indexOf(b as (typeof BRANCH_HANJA)[number]);
  if (si < 0 || bi < 0) return null;
  // 60갑자는 천간과 지지의 음양이 같아야 한다 (인덱스 짝수/홀수 일치).
  if (si % 2 !== bi % 2) return null;
  return { stem: STEMS[si], branch: BRANCHES[bi] };
}

export function pillarToString(p: Pillar | null | undefined): string | null {
  return p ? `${p.stem}${p.branch}` : null;
}

export function pillarToHanja(p: Pillar): string {
  return `${STEM_HANJA[STEMS.indexOf(p.stem)]}${BRANCH_HANJA[BRANCHES.indexOf(p.branch)]}`;
}

export function samePillar(a: Pillar | null | undefined, b: Pillar | null | undefined): boolean {
  if (!a || !b) return a == b;
  return a.stem === b.stem && a.branch === b.branch;
}

export function branchElement(b: Branch, index?: number): Element {
  return BRANCH_ELEMENT_BY_INDEX[index ?? BRANCHES.indexOf(b)];
}

export function cnTenGodToKorean(v: unknown): TenGod | null {
  if (typeof v !== "string") return null;
  if ((TEN_GODS as readonly string[]).includes(v)) return v as TenGod;
  return CN_TEN_GOD[v] ?? null;
}

/** 원국 여덟 글자의 단순 오행 개수 (지장간·계절 가중치 없음). 해석이 아닌 단순 집계다. */
export function countElements(pillars: Array<Pillar | null>): Record<Element, number> {
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    if (!p) continue;
    out[STEM_ELEMENT[p.stem]] += 1;
    out[branchElement(p.branch)] += 1;
  }
  return out;
}

/** 띠 (연지 기준) */
export const ZODIAC_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;
export function zodiacAnimal(yearBranch: Branch): string {
  return ZODIAC_ANIMALS[BRANCHES.indexOf(yearBranch)];
}
