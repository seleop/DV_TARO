import { z } from "zod";
import { BRAND } from "@/config/brand";

/**
 * 사용자가 지어 주는 마스코트 이름 (2026-10-25 사용자 결정). 기본 이름은 brand.ts 의 characterName("별이").
 * 화면(입력칸)과 서버(API)가 같은 규칙으로 검사한다. DB(profiles.mascot_name)도 1~8자로 막는다.
 */
export const DEFAULT_MASCOT_NAME = BRAND.characterName;
export const MASCOT_NAME_MAX = 8;
/** 이름 짓기 화면에서 눌러서 고를 수 있는 추천 이름 */
export const MASCOT_NAME_SUGGESTIONS = ["별이", "루나", "콩이", "반짝이", "몽글이", "코코"] as const;

/** 글자·숫자·띄어쓰기와 몇 가지 꾸밈 기호만 (이름표·말풍선에 그대로 보인다) */
const ALLOWED = /^[\p{L}\p{N}\p{M} ·.~♡♥☆★-]+$/u;

/** 앞뒤 공백을 지우고 가운데 공백은 하나로 */
export function normalizeMascotName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

/** 이름이 규칙에 맞지 않으면 안내 문구, 맞으면 null */
export function mascotNameError(raw: string): string | null {
  const v = normalizeMascotName(raw);
  if (!v) return "이름을 적어 주세요.";
  if (Array.from(v).length > MASCOT_NAME_MAX) return `이름은 ${MASCOT_NAME_MAX}자까지 지을 수 있어요.`;
  if (!ALLOWED.test(v)) return "글자·숫자와 · . ~ ♡ ☆ - 만 쓸 수 있어요.";
  return null;
}

export const MascotNameSchema = z
  .string()
  .transform(normalizeMascotName)
  .superRefine((v, ctx) => {
    const msg = mascotNameError(v);
    if (msg) ctx.addIssue({ code: "custom", message: msg });
  });

/** "○○라고/○○이라고" (받침에 따라) */
export function calledAs(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${name}${batchim ? "이라고" : "라고"}`;
}

/** 이름을 지어 줬을 때 마스코트가 하는 말 (기본 이름 그대로면 그에 맞게). polite: 해요체, 아니면 반말 */
export function thanksForName(name: string, polite: boolean) {
  if (name === DEFAULT_MASCOT_NAME) return polite ? `좋아요! 앞으로도 ${calledAs(name)} 불러 주세요 ♡` : `좋아! 그럼 계속 ${calledAs(name)} 불러 줘.`;
  return polite ? `${name}! 마음에 쏙 들어요. 고마워요 ♡` : `${name}! 마음에 쏙 들어.\n고마워, 소중히 할게!`;
}

/** 화면에 보일 이름 (아직 짓지 않았으면 기본 이름) */
export function displayMascotName(name: string | null | undefined) {
  return name || DEFAULT_MASCOT_NAME;
}
