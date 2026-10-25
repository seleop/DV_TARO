/**
 * 마스코트 대화형 결과('별이의 해설석')의 공용 규칙 (화면 없이 테스트할 수 있는 순수 로직).
 *
 * - 결과 API는 사실(원국·카드·일진)과 함께 별이 대사(beats)·추천 질문(suggestions)을 한 번에 돌려준다.
 *   추천 질문의 답도 미리 만들어 두므로, 사용자가 질문을 눌러도 추가 AI 호출이 없다.
 * - 대사마다 동작 신호(cue)를 붙인다. 신호 → 실제 동작은 motionForCue 가 정하고,
 *   새 동작 시트(talk·point·listen·anticipate·sit, 2026-10-25 네 의상 모두 렌더)가 없으면 지금 있는 동작으로 대체한다.
 * - 예전에 저장된 해석(대사 없음)과 모의 응답은 해석 내용으로 대사를 만든다 (*DialogueFallback).
 */
import { josa } from "./josa";
import type { DailyDialogue, DailyReading, SajuDialogue, SajuReading, TarotDialogue, TarotReading } from "./ai/schemas";
import type { Mood } from "./character";

export const CUES = ["greet", "explain", "point", "listen", "anticipate", "reveal", "celebrate", "comfort", "surprise", "nod"] as const;
export type Cue = (typeof CUES)[number];

/** 추천 질문 종류: 깊이(이게 나에게 무슨 뜻인지) · 실천(지금 해 볼 일) · 분야(결과에서 두드러진 분야) */
export const SUGGESTION_KINDS = ["deeper", "action", "topic"] as const;

/** 신호별 [대화용 동작, 그 시트가 없을 때 대체 동작]. reveal 은 의상 장면에서 대표 동작(책·카드·별 보기)으로 바뀐다 (lib/mascot resolveSheet) */
const CUE_MOTION: Record<Cue, { want: string; now: string }> = {
  greet: { want: "wave", now: "wave" },
  explain: { want: "talk", now: "idle" },
  point: { want: "point", now: "nod" },
  listen: { want: "listen", now: "nod" },
  anticipate: { want: "anticipate", now: "reveal" },
  reveal: { want: "reveal", now: "reveal" },
  celebrate: { want: "celebrate", now: "celebrate" },
  comfort: { want: "sit", now: "idle" },
  surprise: { want: "surprised", now: "surprised" },
  nod: { want: "nod", now: "nod" },
};

/** 동작 신호 → 재생할 동작 이름. has: 그 동작 시트가 있는지 (의상 반영은 부르는 쪽에서) */
export function motionForCue(cue: Cue, has: (state: string) => boolean): string {
  const m = CUE_MOTION[cue];
  return has(m.want) ? m.want : m.now;
}

/** 결과 분위기 → 결과를 처음 보여 줄 때의 신호 */
export function cueForMood(mood: Mood | null | undefined): Cue {
  if (mood === "great") return "celebrate";
  if (mood === "careful") return "comfort";
  return "reveal";
}

// ── 사주: 장(챕터) 구성 ──
export const SAJU_FOCUS = [
  "pillars",
  "dayMaster",
  "elements",
  "tenGods",
  "personality",
  "strengths",
  "cautions",
  "career",
  "wealth",
  "relationships",
  "yearly",
  "daewoon",
] as const;
export type SajuFocus = (typeof SAJU_FOCUS)[number];
export const PILLAR_FIELDS = ["year", "month", "day", "hour"] as const;

export const SAJU_CHAPTERS: ReadonlyArray<{ id: string; title: string; focus: readonly SajuFocus[] }> = [
  { id: "chart", title: "원국", focus: ["pillars", "dayMaster", "elements", "tenGods"] },
  { id: "self", title: "타고난 나", focus: ["personality", "strengths", "cautions"] },
  { id: "work", title: "일과 재물", focus: ["career", "wealth"] },
  { id: "people", title: "사람", focus: ["relationships"] },
  { id: "flow", title: "올해와 대운", focus: ["yearly", "daewoon"] },
];

/** 사주 대사를 장별로 묶는다. 대사가 하나도 없는 장은 뺀다 */
export function sajuChapters(d: Pick<SajuDialogue, "beats">) {
  return SAJU_CHAPTERS.map((ch) => ({ id: ch.id, title: ch.title, beats: d.beats.filter((b) => ch.focus.includes(b.focus)) })).filter((ch) => ch.beats.length > 0);
}

// ── 오늘의 운세: 내일 예고 (AI 없이 미리 써 둔 문구) ──
const TEN_GOD_TEASER: Record<string, string> = {
  비견: "내 페이스를 지키기 좋은 날이야.",
  겁재: "함께하는 사람과 속도를 맞춰 보면 좋은 날이야.",
  식신: "손으로 만드는 일이 즐거워지는 날이야.",
  상관: "아이디어가 톡톡 튀는 날이야. 말은 한 번 더 다듬고!",
  편재: "새로운 기회에 눈이 가는 날이야.",
  정재: "꼼꼼함이 빛나는 날이야.",
  편관: "조금 바빠도 버텨 낼 힘이 있는 날이야.",
  정관: "약속과 순서를 지키면 인정받기 좋은 날이야.",
  편인: "혼자 생각을 정리하기 좋은 날이야.",
  정인: "배우고 도움받기 좋은 날이야.",
};

export function tomorrowTeaser(tenGod: string | null | undefined) {
  const line = tenGod ? TEN_GOD_TEASER[tenGod] : undefined;
  return line ? `내일은 '${tenGod}'의 날, ${line} 아침에 또 보자!` : "내일 아침에 또 보자!";
}

// ── 예전 해석·모의 응답용 대사 만들기 ──

/** 긴 문장을 max 글자 안으로 줄인다 (가능하면 문장 끝에서 자름) */
export function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end >= max * 0.3 ? cut.slice(0, end + 1).trim() : `${cut.trimEnd()}…`;
}

const SAY = 150;
const ANSWER = 380;

export function sajuDialogueFallback(
  r: SajuReading,
  facts: { day?: { ganji: string; hanja: string } | null; dayMaster?: { stem: string; element: string } | null; elements?: Record<string, number> | null },
): SajuDialogue {
  const beats: SajuDialogue["beats"] = [];
  if (facts.day) beats.push({ say: `네 기둥 가운데 일주가 ${facts.day.ganji}(${facts.day.hanja})야. 이 책의 주인공이지.`, focus: "pillars", pillar: "day", cue: "point" });
  if (facts.dayMaster) beats.push({ say: `일간 ${facts.dayMaster.stem}(${facts.dayMaster.element}), 바로 너 자신을 뜻하는 글자야.`, focus: "dayMaster", pillar: "day", cue: "explain" });
  const top = facts.elements ? Object.entries(facts.elements).sort((a, b) => b[1] - a[1])[0] : null;
  if (top) beats.push({ say: `다섯 기운 가운데 ${top[0]} 기운이 ${top[1]}개로 가장 많아.`, focus: "elements", pillar: null, cue: "explain" });
  beats.push(
    { say: clip(r.personality, SAY), focus: "personality", pillar: null, cue: "explain" },
    { say: clip(`잘하는 건 이거야. ${r.strengths[0]}`, SAY), focus: "strengths", pillar: null, cue: "celebrate" },
    { say: clip(`조심할 건 하나. ${r.cautions[0]}`, SAY), focus: "cautions", pillar: null, cue: "comfort" },
    { say: clip(r.career, SAY), focus: "career", pillar: null, cue: "explain" },
    { say: clip(r.wealth, SAY), focus: "wealth", pillar: null, cue: "explain" },
    { say: clip(r.relationships, SAY), focus: "relationships", pillar: null, cue: "explain" },
    { say: clip(r.yearlyOutlook.text, SAY), focus: "yearly", pillar: null, cue: "explain" },
  );
  return {
    beats,
    suggestions: [
      { kind: "deeper", question: "이게 나한테 무슨 뜻이야?", answer: clip(r.summary, ANSWER) },
      { kind: "action", question: "그럼 지금 뭘 해 보면 좋아?", answer: clip(`${r.strengths[0]} ${r.cautions[0]}`, ANSWER) },
      { kind: "topic", question: `${r.yearlyOutlook.year}년은 어떻게 흘러가?`, answer: clip(r.yearlyOutlook.text, ANSWER) },
    ],
    closing: "궁금한 장이 있으면 언제든 다시 펼쳐 줄게.",
  };
}

export function dailyDialogueFallback(r: DailyReading): DailyDialogue {
  const one = (text: string, cue: Cue = "explain") => [{ say: clip(text, SAY), cue }];
  return {
    opening: [
      { say: clip(`오늘 한마디는 "${r.headline}"이야.`, SAY), cue: cueForMood(r.mood) },
      ...(r.highlights[0] ? one(r.highlights[0].text) : []),
    ],
    branches: { love: one(r.love), work: one(r.work), luck: one(r.luck) },
    step: { action: clip(r.tip, 60), why: "작은 걸음 하나가 오늘 흐름을 바꿔 줄 거야." },
    suggestions: [
      { kind: "deeper", question: "오늘 흐름을 한마디로 하면?", answer: clip(r.highlights.map((h) => h.text).join(" "), ANSWER) },
      { kind: "action", question: "오늘 뭘 해 보면 좋아?", answer: clip(r.tip, ANSWER) },
      { kind: "topic", question: "행운의 색이랑 물건은?", answer: clip(`행운의 색은 ${r.lucky.color}, 행운의 물건은 ${r.lucky.item}이야. 재미로 챙겨 봐!`, ANSWER) },
    ],
    closing: "오늘도 네 걸음대로 가 보자.",
  };
}

export function tarotDialogueFallback(r: Pick<TarotReading, "overall" | "cards" | "advice">, drawn: ReadonlyArray<{ position: string; nameKo: string; reversed: boolean; keywords: string[] }>): TarotDialogue {
  const key = drawn.find((d) => d.reversed) ?? drawn[drawn.length - 1];
  const interp = (position: string) => r.cards.find((c) => c.position === position)?.interpretation ?? "";
  return {
    opening: [{ say: "카드를 펼쳐 볼게. 마음속 질문을 한 번 더 떠올려 줘.", cue: "anticipate" }],
    cards: drawn.map((d) => ({
      position: d.position,
      beats: [
        { say: `${d.position} 자리에 ${josa(`'${d.nameKo}'${d.reversed ? " 역방향" : ""}`, "이/가")} 나왔어.`, cue: "reveal" as Cue },
        { say: clip(interp(d.position) || d.keywords.join(", "), SAY), cue: "explain" as Cue },
      ],
    })),
    overall: [{ say: clip(r.overall, SAY), cue: "explain" }],
    suggestions: [
      { kind: "deeper", question: "이 카드들이 나한테 뭘 말해?", answer: clip(r.overall, ANSWER) },
      { kind: "action", question: "지금 당장 할 수 있는 건?", answer: clip(r.advice, ANSWER) },
      { kind: "topic", question: clip(`'${key.nameKo}' 카드는 무슨 뜻이야?`, 40), answer: clip(`${key.keywords.join(", ")}. ${interp(key.position)}`, ANSWER) },
    ],
    closing: "카드는 길을 비춰 줄 뿐, 걸음은 네가 정해.",
  };
}
