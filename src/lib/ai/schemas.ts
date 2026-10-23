import { z } from "zod";

/**
 * AI 출력 스키마.
 * - Api*Schema: 모델에 전달하는 구조 (structured outputs가 지원하는 기본 타입만 사용)
 * - *Schema: 응답 수신 후 적용하는 엄격한 검증 (길이·개수 제한). 실패하면 결과를 저장하지 않는다.
 *
 * 필드는 모두 필수다. 내용이 없을 때는 빈 배열 대신 "해당 없음" 같은 문장을 쓰도록 프롬프트에서 지시한다.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const list = (maxItems: number, maxLen: number) => z.array(text(maxLen)).min(1).max(maxItems);

// ── 사주 종합 해석 ──
export const ApiSajuReadingSchema = z.object({
  summary: z.string().describe("2~3문장 요약"),
  personality: z.string().describe("성격 풀이"),
  strengths: z.array(z.string()).describe("강점 2~5개"),
  cautions: z.array(z.string()).describe("주의할 점 2~5개"),
  career: z.string().describe("직업·일"),
  wealth: z.string().describe("재물"),
  relationships: z.string().describe("연애·인간관계"),
  yearlyOutlook: z.object({
    year: z.number().int(),
    yearGanji: z.string().nullable().describe("제공된 세운 간지를 그대로. 제공되지 않았으면 null"),
    text: z.string(),
  }),
  evidence: z.array(z.object({ claim: z.string(), basis: z.string().describe("근거로 쓴 입력 데이터 항목") })),
  limitations: z.array(z.string()),
  disclaimer: z.string(),
});

export const SajuReadingSchema = z.object({
  summary: text(600),
  personality: text(1500),
  strengths: list(6, 200),
  cautions: list(6, 200),
  career: text(1200),
  wealth: text(1200),
  relationships: text(1200),
  yearlyOutlook: z.object({ year: z.number().int().min(1900).max(2200), yearGanji: z.string().max(4).nullable(), text: text(1500) }),
  evidence: z.array(z.object({ claim: text(200), basis: text(300) })).min(1).max(12),
  limitations: z.array(text(300)).max(8),
  disclaimer: text(400),
});
export type SajuReading = z.infer<typeof SajuReadingSchema>;

// ── 오늘의 운세 (사주 기반) ──
export const ApiDailyReadingSchema = z.object({
  headline: z.string().describe("오늘을 한마디로, 15자 안팎의 별명 같은 문구 (예: 매일 발전하는 똑똑이)"),
  highlights: z.array(z.object({ emoji: z.string().describe("이모지 1개"), text: z.string().describe("25자 안팎 한 줄") })).describe("오늘의 요약 3줄"),
  love: z.string().describe("연애운"),
  work: z.string().describe("직업운"),
  luck: z.string().describe("행운 기운 (금전·기회 포함)"),
  food: z.object({ name: z.string(), reason: z.string() }).describe("추천 음식 1가지와 가벼운 이유 (건강 효능 단정 금지)"),
  lucky: z.object({ color: z.string(), item: z.string() }),
  tip: z.string(),
  evidence: z.array(z.object({ claim: z.string(), basis: z.string() })),
  disclaimer: z.string(),
});
export const DailyReadingSchema = z.object({
  headline: text(40),
  highlights: z.array(z.object({ emoji: z.string().trim().min(1).max(8), text: text(80) })).min(1).max(4),
  love: text(500),
  work: text(500),
  luck: text(500),
  food: z.object({ name: text(30), reason: text(200) }),
  lucky: z.object({ color: text(20), item: text(30) }),
  tip: text(300),
  evidence: z.array(z.object({ claim: text(200), basis: text(300) })).min(1).max(6),
  disclaimer: text(300),
});
export type DailyReading = z.infer<typeof DailyReadingSchema>;

// ── 타로 ──
export const ApiTarotReadingSchema = z.object({
  overall: z.string(),
  cards: z.array(z.object({ position: z.string(), cardName: z.string(), interpretation: z.string() })),
  advice: z.string(),
  disclaimer: z.string(),
});
export const TarotReadingSchema = z.object({
  overall: text(1000),
  cards: z.array(z.object({ position: text(40), cardName: text(60), interpretation: text(800) })).min(1).max(5),
  advice: text(600),
  disclaimer: text(300),
});
export type TarotReading = z.infer<typeof TarotReadingSchema>;

// ── 별자리 운세 ──
export const ApiHoroscopeReadingSchema = z.object({
  headline: z.string(),
  overall: z.string(),
  love: z.string(),
  work: z.string(),
  money: z.string(),
  tip: z.string(),
  disclaimer: z.string(),
});
export const HoroscopeReadingSchema = z.object({
  headline: text(120),
  overall: text(800),
  love: text(500),
  work: text(500),
  money: text(500),
  tip: text(300),
  disclaimer: text(300),
});
export type HoroscopeReading = z.infer<typeof HoroscopeReadingSchema>;
