import { z } from "zod";
import { MOODS } from "../character";
import { CUES, PILLAR_FIELDS, SAJU_FOCUS, SUGGESTION_KINDS } from "../dialogue";

/**
 * AI 출력 스키마.
 * - Api*Schema: 모델에 전달하는 구조 (structured outputs가 지원하는 기본 타입만 사용)
 * - *Schema: 응답 수신 후 적용하는 엄격한 검증 (길이·개수 제한). 실패하면 결과를 저장하지 않는다.
 *
 * 필드는 모두 필수다. 내용이 없을 때는 빈 배열 대신 "해당 없음" 같은 문장을 쓰도록 프롬프트에서 지시한다.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const list = (maxItems: number, maxLen: number) => z.array(text(maxLen)).min(1).max(maxItems);
/** 캐릭터 표정 연출용 분위기. 예전에 저장된 해석에는 없으므로 엄격 스키마에서는 선택 항목 */
const apiMood = z.enum(MOODS).describe("전반적 분위기: great(아주 좋음) / good(좋음) / calm(무난·잔잔) / careful(쉬어가기·신중)");
const mood = z.enum(MOODS).optional();

// ── 별이 대사 (대화형 결과, lib/dialogue.ts). 예전에 저장된 해석에는 없으므로 엄격 스키마에서는 선택 항목 ──
const apiCue = z
  .enum(CUES)
  .describe("대사에 맞춘 별이 동작: greet 첫인사 / explain 설명 / point 화면의 판·카드를 가리킴 / listen 사용자 선택에 반응 / anticipate 공개 직전 / reveal 공개 / celebrate 좋은 소식 / comfort 쉬어가기·위로 / surprise 의외의 발견 / nod 맞장구");
const apiSay = z.string().describe("별이의 한 마디: 다정한 반말 1~2문장, 80자 안팎");
const apiBeat = z.object({ say: apiSay, cue: apiCue });
const apiSuggestions = z
  .array(
    z.object({
      kind: z.enum(SUGGESTION_KINDS).describe("deeper 이 결과가 나에게 어떤 의미인지 / action 지금 해 볼 일 / topic 결과에서 가장 두드러진 분야"),
      question: z.string().describe("사용자가 별이에게 묻는 질문, 반말 구어체 25자 이내, 이 결과에 맞게 구체적으로"),
      answer: z.string().describe("별이의 답 2~3문장"),
    }),
  )
  .describe("추천 질문 3개: deeper·action·topic 하나씩");
const apiClosing = z.string().describe("마무리 한 마디: 다음 행동을 가볍게 권함");

const say = text(160);
const cue = z.enum(CUES);
const beat = z.object({ say, cue });
const beats = (min: number, max: number) => z.array(beat).min(min).max(max);
const suggestions = z.array(z.object({ kind: z.enum(SUGGESTION_KINDS), question: text(40), answer: text(400) })).min(2).max(3);

export const ApiSajuDialogueSchema = z.object({
  beats: z
    .array(
      z.object({
        say: apiSay,
        focus: z.enum(SAJU_FOCUS).describe("이 대사가 설명하는 부분"),
        pillar: z.enum(PILLAR_FIELDS).nullable().describe("원국 판에서 가리키는 기둥(year·month·day·hour). 기둥을 가리키지 않으면 null"),
        cue: apiCue,
      }),
    )
    .describe("장 순서대로 8~12개: 원국(pillars·dayMaster·elements·tenGods) → 타고난 나(personality·strengths·cautions) → 일과 재물(career·wealth) → 사람(relationships) → 흐름(yearly·daewoon)"),
  suggestions: apiSuggestions,
  closing: apiClosing,
});
export const SajuDialogueSchema = z.object({
  beats: z.array(z.object({ say, focus: z.enum(SAJU_FOCUS), pillar: z.enum(PILLAR_FIELDS).nullable(), cue })).min(4).max(14),
  suggestions,
  closing: say,
});
export type SajuDialogue = z.infer<typeof SajuDialogueSchema>;

export const ApiDailyDialogueSchema = z.object({
  opening: z.array(apiBeat).describe("오늘의 결론을 먼저 말하는 대사 1~2개"),
  branches: z
    .object({ love: z.array(apiBeat), work: z.array(apiBeat), luck: z.array(apiBeat) })
    .describe("사용자가 고른 갈래(연애·일·행운)에서만 보이는 대사, 갈래마다 1~3개"),
  step: z
    .object({ action: z.string().describe("오늘의 한 걸음: 오늘 안에 할 수 있는 작은 행동 하나, 35자 이내"), why: z.string().describe("그 행동을 권하는 이유 한 문장") })
    .describe("오늘의 한 걸음"),
  suggestions: apiSuggestions,
  closing: apiClosing,
});
export const DailyDialogueSchema = z.object({
  opening: beats(1, 3),
  branches: z.object({ love: beats(1, 4), work: beats(1, 4), luck: beats(1, 4) }),
  step: z.object({ action: text(60), why: text(200) }),
  suggestions,
  closing: say,
});
export type DailyDialogue = z.infer<typeof DailyDialogueSchema>;

export const ApiTarotDialogueSchema = z.object({
  opening: z.array(apiBeat).describe("질문을 받아 주는 대사 1~2개 (질문을 그대로 되풀이하지 않음)"),
  cards: z
    .array(z.object({ position: z.string().describe("뽑힌 카드의 위치 이름 그대로"), beats: z.array(apiBeat).describe("카드를 뒤집을 때 하는 대사 1~3개, 첫 대사의 cue는 reveal") }))
    .describe("뽑힌 순서 그대로, 카드마다 하나"),
  overall: z.array(apiBeat).describe("모든 카드를 본 뒤의 총평 대사 1~3개"),
  suggestions: apiSuggestions,
  closing: apiClosing,
});
export const TarotDialogueSchema = z.object({
  opening: beats(1, 3),
  cards: z.array(z.object({ position: text(40), beats: beats(1, 4) })).min(1).max(5),
  overall: beats(1, 4),
  suggestions,
  closing: say,
});
export type TarotDialogue = z.infer<typeof TarotDialogueSchema>;

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
  dialogue: ApiSajuDialogueSchema.describe("별이가 결과 화면에서 한 마디씩 건네는 대사와 추천 질문"),
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
  dialogue: SajuDialogueSchema.optional(),
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
  mood: apiMood,
  disclaimer: z.string(),
  dialogue: ApiDailyDialogueSchema.describe("별이가 결과 화면에서 건네는 대사·오늘의 한 걸음·추천 질문"),
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
  mood,
  disclaimer: text(300),
  dialogue: DailyDialogueSchema.optional(),
});
export type DailyReading = z.infer<typeof DailyReadingSchema>;

// ── 타로 ──
export const ApiTarotReadingSchema = z.object({
  overall: z.string(),
  cards: z.array(z.object({ position: z.string(), cardName: z.string(), interpretation: z.string() })),
  advice: z.string(),
  disclaimer: z.string(),
  dialogue: ApiTarotDialogueSchema.describe("별이가 카드를 한 장씩 뒤집으며 건네는 대사와 추천 질문"),
});
export const TarotReadingSchema = z.object({
  overall: text(1000),
  cards: z.array(z.object({ position: text(40), cardName: text(60), interpretation: text(800) })).min(1).max(5),
  advice: text(600),
  disclaimer: text(300),
  dialogue: TarotDialogueSchema.optional(),
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
  mood: apiMood,
  disclaimer: z.string(),
});
export const HoroscopeReadingSchema = z.object({
  headline: text(120),
  overall: text(800),
  love: text(500),
  work: text(500),
  money: text(500),
  tip: text(300),
  mood,
  disclaimer: text(300),
});
export type HoroscopeReading = z.infer<typeof HoroscopeReadingSchema>;
