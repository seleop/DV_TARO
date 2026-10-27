import "server-only";
import { getTenGod } from "manseryeok";
import type { z } from "zod";
import { MOODS } from "../character";
import { hmac } from "../crypto";
import { assertAiAllowed } from "../limits";
import { findReadingByCacheKey, getLatestReadingForCalculation, saveReading, type StoredCalculation, type StoredReading } from "../repo/records";
import { logUsage } from "../repo/usage";
import { BRANCHES, BRANCH_HANJA, STEMS, STEM_HANJA, type Stem } from "../saju/ganji";
import { verifiedDateGanji, type SajuComputation } from "../saju/service";
import { signById, signFor, type ZodiacSign } from "../horoscope/zodiac";
import { DECK, drawCards, SPREADS, type DrawnCard, type SpreadId } from "../tarot/deck";
import { dailyDialogueFallback, sajuDialogueFallback, tarotDialogueFallback, tomorrowTeaser } from "../dialogue";
import { hrumDailyReading, hrumSajuReading } from "./hrum-reading";
import { estimateCostUsd, worstCaseCostUsd } from "./cost";
import {
  buildDailyPayload,
  buildHoroscopePayload,
  buildSajuPayload,
  buildTarotPayload,
  dailySystemPrompt,
  horoscopeSystemPrompt,
  PROMPT_VERSIONS,
  sajuSystemPrompt,
  tarotSystemPrompt,
} from "./prompts";
import { AiError, getAiProvider } from "./provider";
import {
  ApiDailyReadingSchema,
  ApiHoroscopeReadingSchema,
  ApiSajuReadingSchema,
  ApiTarotReadingSchema,
  DailyReadingSchema,
  HoroscopeReadingSchema,
  SajuReadingSchema,
  TarotReadingSchema,
  type DailyReading,
  type HoroscopeReading,
  type SajuReading,
  type TarotReading,
} from "./schemas";

interface RunArgs<T> {
  userId: string;
  kind: keyof typeof PROMPT_VERSIONS;
  system: string;
  user: string;
  apiSchema: z.ZodType;
  strictSchema: z.ZodType<T>;
  maxTokens: number;
  mock: () => T;
  grounding?: (data: T) => string[];
}

/** 공통 AI 실행: 한도 확인 → 호출 → 엄격 검증 → 근거 검사 → 사용량 기록 */
async function runAi<T>(a: RunArgs<T>) {
  const provider = getAiProvider();
  const promptVersion = PROMPT_VERSIONS[a.kind];
  await assertAiAllowed(a.userId, worstCaseCostUsd(provider.model, a.system.length + a.user.length, a.maxTokens));
  const started = performance.now();
  // model: 실제로 답한 모델 (거절 시 서버가 대체 모델로 다시 실행하면 그 모델의 단가로 기록)
  const log = (ok: boolean, usage: { inputTokens: number; outputTokens: number }, errorCode: string | null, model = provider.model) =>
    logUsage({
      userId: a.userId,
      kind: "ai",
      provider: provider.name,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsdEst: estimateCostUsd(model, usage.inputTokens, usage.outputTokens).usd,
      durationMs: performance.now() - started,
      ok,
      errorCode,
      promptVersion,
    });

  let res;
  try {
    res = await provider.generate({ system: a.system, user: a.user, apiSchema: a.apiSchema, maxTokens: a.maxTokens, mock: a.mock });
  } catch (e) {
    const err = e instanceof AiError ? e : new AiError("AI_UPSTREAM_ERROR", "AI 호출 중 오류가 발생했습니다.");
    await log(false, err.usage, err.code);
    throw err;
  }
  const parsed = a.strictSchema.safeParse(res.data);
  if (!parsed.success) {
    await log(false, res.usage, "AI_SCHEMA_INVALID", res.model);
    throw new AiError("AI_SCHEMA_INVALID", "AI 응답이 정해진 형식을 지키지 않아 저장하지 않았습니다. 다시 시도해 주세요.", res.usage);
  }
  const problems = a.grounding?.(parsed.data) ?? [];
  if (problems.length) {
    await log(false, res.usage, "AI_UNGROUNDED", res.model);
    throw new AiError("AI_UNGROUNDED", "AI 응답에 검증되지 않은 간지가 포함되어 저장하지 않았습니다. 다시 시도해 주세요.", res.usage);
  }
  await log(true, res.usage, null, res.model);
  return { content: parsed.data, provider: res.provider, model: res.model, promptVersion };
}

/** 실제 AI를 연결한 뒤에는 모의 응답으로 저장된 결과를 다시 쓰지 않는다 (같은 날 운세·예전 사주 풀이가 모의 문장으로 남지 않게) */
export function isStaleMock(provider: string, useHrum = false) {
  return provider === "mock" && (useHrum || getAiProvider().name !== "mock");
}

// ── 근거 검사: 출력에 등장하는 간지가 입력으로 준 값인지 확인 ──
const HANJA_GANJI = /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g;
const KO_GANJI_WITH_ROLE = /([갑을병정무기경신임계][자축인묘진사오미신유술해])\s?(?:\([^)]*\)\s?)?(년주|월주|일주|시주|대운|세운|일진)/g;

function hanjaToKo(h: string) {
  return `${STEMS[STEM_HANJA.indexOf(h[0] as (typeof STEM_HANJA)[number])]}${BRANCHES[BRANCH_HANJA.indexOf(h[1] as (typeof BRANCH_HANJA)[number])]}`;
}

export function findUngroundedGanji(output: unknown, allowed: Set<string>): string[] {
  const text = JSON.stringify(output);
  const bad = new Set<string>();
  for (const m of text.matchAll(HANJA_GANJI)) {
    const ko = hanjaToKo(m[0]);
    if (!allowed.has(ko)) bad.add(ko);
  }
  for (const m of text.matchAll(KO_GANJI_WITH_ROLE)) {
    if (!allowed.has(m[1])) bad.add(m[1]);
  }
  return [...bad];
}

function allowedGanji(c: SajuComputation, extra: Array<string | null | undefined>) {
  const s = new Set<string>();
  for (const p of Object.values(c.canonical.pillars)) if (p) s.add(p.ganji);
  for (const p of c.canonical.daewoon?.pillars ?? []) s.add(p);
  for (const e of extra) if (e) s.add(e);
  return s;
}

// ── 사주 종합 해석 ──
const FOCUS_OPTIONS = ["성격", "직업", "재물", "연애", "인간관계", "올해 운세"] as const;
export type Focus = (typeof FOCUS_OPTIONS)[number];
export { FOCUS_OPTIONS };

/** 별이 대사에 쓰는 확정 사실 (예전 해석·모의 응답의 대사 만들기용) */
function sajuFacts(c: SajuComputation) {
  return { day: c.canonical.pillars.day, dayMaster: c.canonical.dayMaster, elements: c.canonical.elements };
}

/** 대사가 없는 해석(예전에 저장된 것)에는 해석 내용으로 만든 대사를 붙인다 */
function withSajuDialogue(r: SajuReading, c: SajuComputation): SajuReading {
  return r.dialogue ? r : { ...r, dialogue: sajuDialogueFallback(r, sajuFacts(c)) };
}

function mockSaju(c: SajuComputation, targetYear: number, yearGanji: string | null): SajuReading {
  const dm = c.canonical.dayMaster;
  const el = c.canonical.elements;
  const top = el ? (Object.entries(el).sort((a, b) => b[1] - a[1])[0] as [string, number]) : null;
  const low = el ? (Object.entries(el).sort((a, b) => a[1] - b[1])[0] as [string, number]) : null;
  const dmText = dm ? `일간 ${dm.stem}(${dm.element})` : "일간 미확정";
  return {
    summary: `[모의 응답] ${dmText}을 중심으로 본 기본 성향 요약입니다. 실제 AI 연결 전 화면 확인용 문장입니다.`,
    personality: `${dmText}의 상징을 바탕으로 한 성격 설명이 이곳에 들어갑니다.${top ? ` 원국에서 ${top[0]} 기운이 ${top[1]}개로 가장 많습니다.` : ""}`,
    strengths: [top ? `${top[0]} 기운이 뚜렷해 그 성질을 살리기 좋습니다.` : "강점 예시 문장입니다.", "꾸준함을 장점으로 살릴 수 있습니다."],
    cautions: [low ? `${low[0]} 기운이 적어 그 부분을 의식적으로 보완해 보면 좋겠습니다.` : "주의할 점 예시 문장입니다.", "무리한 일정은 피하는 편이 좋습니다."],
    career: "직업·일에 대한 해석 예시입니다.",
    wealth: "재물 흐름에 대한 해석 예시입니다.",
    relationships: "연애·인간관계에 대한 해석 예시입니다.",
    yearlyOutlook: { year: targetYear, yearGanji, text: `${targetYear}년 흐름에 대한 해석 예시입니다.` },
    evidence: [{ claim: "기본 성향", basis: dmText }],
    limitations: c.status === "MATCH" ? ["모의 응답이므로 실제 해석이 아닙니다."] : [`검증 상태가 ${c.status}이므로 일부 항목은 해석에서 제외했습니다.`, "모의 응답이므로 실제 해석이 아닙니다."],
    disclaimer: "운세는 오락과 자기 성찰을 위한 참고 정보입니다.",
  };
}

export async function generateSajuReading(
  userId: string,
  calc: StoredCalculation,
  /** useHrum: 흐름 AI 리딩으로 풀이 (키가 있고 새 개인정보 고지에 동의한 사용자, lib/privacy-consent.ts) */
  opts: { focus: Focus[]; targetYear: number; useHrum?: boolean; fetchImpl?: typeof fetch },
): Promise<StoredReading<SajuReading>> {
  const c = calc.result;
  if (!c.canonical.pillars.day) {
    throw new AiError("AI_UNGROUNDED", "일주가 확정되지 않아 AI 해석을 만들 수 없습니다. 입력값이나 설정을 확인해 주세요.");
  }
  const yearG = await verifiedDateGanji(new Date(Date.UTC(opts.targetYear, 6, 1, 3)));
  const yearGanji = yearG?.year ?? null;
  if (opts.useHrum) {
    const h = await hrumSajuReading(userId, c, { focus: opts.focus, targetYear: opts.targetYear, yearGanji, fetchImpl: opts.fetchImpl });
    const saved = { kind: "saju" as const, calculationId: calc.id, cacheKey: null, provider: "hrum", model: "hrum-reading", promptVersion: h.promptVersion, content: h.content };
    const id = await saveReading(userId, saved);
    return { id, ...saved, createdAt: Date.now() };
  }
  const user = buildSajuPayload(c, {
    gender: calc.input.gender,
    dayBoundary: calc.input.settings.dayBoundary,
    targetYear: opts.targetYear,
    yearGanji,
    focus: opts.focus,
  });
  const allowed = allowedGanji(c, [yearGanji]);
  const r = await runAi<SajuReading>({
    userId,
    kind: "saju",
    system: sajuSystemPrompt(),
    user,
    apiSchema: ApiSajuReadingSchema,
    strictSchema: SajuReadingSchema,
    maxTokens: 16000,
    mock: () => withSajuDialogue(mockSaju(c, opts.targetYear, yearGanji), c),
    grounding: (d) => {
      const bad = findUngroundedGanji(d, allowed);
      if (d.yearlyOutlook.yearGanji && d.yearlyOutlook.yearGanji !== yearGanji) bad.push(`yearGanji:${d.yearlyOutlook.yearGanji}`);
      if (d.yearlyOutlook.year !== opts.targetYear) bad.push("year");
      return bad;
    },
  });
  const content = withSajuDialogue(r.content, c);
  const id = await saveReading(userId, { kind: "saju", calculationId: calc.id, cacheKey: null, ...r, content });
  return { id, kind: "saju", calculationId: calc.id, provider: r.provider, model: r.model, promptVersion: r.promptVersion, content, createdAt: Date.now() };
}

export async function latestSajuReading(userId: string, calc: StoredCalculation, useHrum = false) {
  const r = await getLatestReadingForCalculation<SajuReading>(userId, calc.id, "saju");
  // 모의 응답 풀이는 실제 AI 연결 후에는 없는 것으로 본다 → 화면에 "풀이 듣기" 버튼이 다시 나온다
  return r && !isStaleMock(r.provider, useHrum) ? { ...r, content: withSajuDialogue(r.content, calc.result) } : null;
}

// ── 오늘의 운세 ──
/** 오늘의 운세 캐시 키 (date: 한국 날짜 YYYY-MM-DD). 홈 화면의 "오늘 봤어요" 표시도 이 키로 찾는다 (lib/home.ts) */
export function dailyReadingCacheKey(calculationId: string, date: string) {
  return hmac(`daily:${calculationId}:${date}:${PROMPT_VERSIONS.daily}`);
}

export async function generateDailyReading(userId: string, calc: StoredCalculation, opts: { regenerate: boolean; now?: Date; useHrum?: boolean; fetchImpl?: typeof fetch }) {
  const c = calc.result;
  const dm = c.canonical.dayMaster;
  if (!dm) throw new AiError("AI_UNGROUNDED", "일간이 확정되지 않아 오늘의 운세를 만들 수 없습니다.");
  const today = await verifiedDateGanji(opts.now ?? new Date());
  if (!today) throw new AiError("AI_UNGROUNDED", "오늘의 일진을 검증하지 못했습니다.");
  const tenGod = getTenGod(dm.stem as Stem, today.day[0] as Stem) as string;
  const tomorrow = await tomorrowPreview(dm.stem as Stem, opts.now ?? new Date());
  const cacheKey = dailyReadingCacheKey(calc.id, today.date);
  if (!opts.regenerate) {
    const hit = await findReadingByCacheKey<DailyReading>(userId, cacheKey);
    if (hit && !isStaleMock(hit.provider, opts.useHrum)) return { reading: { ...hit, content: withDailyDialogue(hit.content) }, today: { ...today, tenGod }, tomorrow, cached: true };
  }
  if (opts.useHrum) {
    // 흐름 /today 는 생년월일시가 필요하다 (음력 입력이면 변환한 양력 날짜, 시각은 입력한 그대로)
    const i = calc.input;
    const birth = { ...c.solarDate, hour: i.timeKnown ? i.hour : null, minute: i.timeKnown ? i.minute : null, gender: i.gender };
    const h = await hrumDailyReading(userId, c, birth, today.date, opts.fetchImpl);
    const saved = { kind: "daily" as const, calculationId: calc.id, cacheKey, provider: "hrum", model: "hrum-reading", promptVersion: h.promptVersion, content: h.content };
    const id = await saveReading(userId, saved);
    return { reading: { id, ...saved, createdAt: Date.now() }, today: { ...today, tenGod }, tomorrow, cached: false };
  }
  const allowed = allowedGanji(c, [today.day, today.month, today.year]);
  const r = await runAi<DailyReading>({
    userId,
    kind: "daily",
    system: dailySystemPrompt(),
    user: buildDailyPayload(c, { date: today.date, day: today.day, tenGod }),
    apiSchema: ApiDailyReadingSchema,
    strictSchema: DailyReadingSchema,
    maxTokens: 8000,
    mock: () => withDailyDialogue({
      headline: `[모의] ${tenGod}의 날`,
      highlights: [
        { emoji: "🌱", text: `오늘 일진 ${today.day}의 기운이 들어와요.` },
        { emoji: "🔎", text: `일간 ${dm.stem}에게 오늘은 ${tenGod}에 해당해요.` },
        { emoji: "✨", text: "실제 AI 연결 전 예시 문장이에요." },
      ],
      love: "연애운 예시 문장입니다.",
      work: "직업운 예시 문장입니다.",
      luck: "행운 기운 예시 문장입니다.",
      food: { name: "따뜻한 국수", reason: "예시로 넣은 추천 음식이에요." },
      lucky: { color: "보라색", item: "작은 메모장" },
      tip: "물 한 잔 마시고 시작해 보세요.",
      evidence: [{ claim: `${tenGod}의 날`, basis: `오늘 일진 ${today.day}, 일간 ${dm.stem}` }],
      mood: MOODS[today.day.charCodeAt(0) % MOODS.length],
      disclaimer: "오락과 참고용입니다.",
    }),
    grounding: (d) => findUngroundedGanji(d, allowed),
  });
  const content = withDailyDialogue(r.content);
  const id = await saveReading(userId, { kind: "daily", calculationId: calc.id, cacheKey, ...r, content });
  return {
    reading: { id, kind: "daily" as const, calculationId: calc.id, provider: r.provider, model: r.model, promptVersion: r.promptVersion, content, createdAt: Date.now() },
    today: { ...today, tenGod },
    tomorrow,
    cached: false,
  };
}

function withDailyDialogue(r: DailyReading): DailyReading {
  return r.dialogue ? r : { ...r, dialogue: dailyDialogueFallback(r) };
}

/** 내일 예고: 내일 일진·십신은 계산으로 미리 알 수 있어 AI 없이 미리 써 둔 문구로 보여 준다. 검증 실패 시 null */
async function tomorrowPreview(dayStem: Stem, now: Date) {
  const t = await verifiedDateGanji(new Date(now.getTime() + 24 * 3600_000));
  if (!t) return null;
  const tenGod = getTenGod(dayStem, t.day[0] as Stem) as string;
  return { date: t.date, day: t.day, tenGod, teaser: tomorrowTeaser(tenGod) };
}

// ── 타로 ──
export async function generateTarotReading(userId: string, question: string, spread: SpreadId, draw: () => DrawnCard[] = () => drawCards(spread)) {
  const cards = draw();
  const sp = SPREADS[spread];
  const r = await runAi<TarotReading>({
    userId,
    kind: "tarot",
    system: tarotSystemPrompt(),
    user: buildTarotPayload(question, sp.label, cards),
    apiSchema: ApiTarotReadingSchema,
    strictSchema: TarotReadingSchema,
    maxTokens: 10000,
    mock: () => withTarotDialogue(
      {
        overall: "[모의 응답] 뽑힌 카드의 키워드를 바탕으로 한 종합 해석 예시입니다.",
        cards: cards.map((c) => ({ position: c.position, cardName: c.nameKo, interpretation: `${c.reversed ? "역방향" : "정방향"} — ${c.keywords.join(", ")}의 의미를 담은 예시 해석입니다.` })),
        advice: "카드의 키워드를 오늘 하루의 질문으로 삼아 보세요.",
        disclaimer: "타로는 오락과 자기 성찰을 위한 참고 정보입니다.",
      },
      cards,
    ),
    grounding: (d) => {
      const names = new Set(cards.map((c) => c.nameKo));
      const bad = d.cards.filter((x) => !names.has(x.cardName)).map((x) => `card:${x.cardName}`);
      if (d.dialogue) {
        // 대사의 카드 순서·위치는 뽑힌 카드 그대로, 뽑히지 않은 카드는 언급하지 않는다
        const positions = d.dialogue.cards.map((x) => x.position).join("|");
        if (positions !== cards.map((c) => c.position).join("|")) bad.push(`dialogue-positions:${positions}`);
        bad.push(...findForeignCards(d.dialogue, cards).map((n) => `dialogue-card:${n}`));
      }
      return bad;
    },
  });
  const content = { ...withTarotDialogue(r.content, cards), drawn: cards, spread, question };
  const id = await saveReading(userId, { kind: "tarot", calculationId: null, cacheKey: null, provider: r.provider, model: r.model, promptVersion: r.promptVersion, content });
  return { id, content, provider: r.provider, model: r.model };
}

function withTarotDialogue(r: TarotReading, cards: DrawnCard[]): TarotReading {
  return r.dialogue ? r : { ...r, dialogue: tarotDialogueFallback(r, cards) };
}

/**
 * 대사에 뽑히지 않은 카드가 나오는지 찾는다. 한 글자 카드 이름(별·달·힘·탑)은 일상어와 겹치므로
 * 한국어 이름은 "○○ 카드" 꼴로 쓴 것만(앞이 다른 글자면 제외: '여황제 카드'는 '황제'가 아님), 영어 이름은 그대로 찾는다.
 */
export function findForeignCards(output: unknown, drawn: ReadonlyArray<{ id: string }>): string[] {
  const text = JSON.stringify(output);
  const lower = text.toLowerCase();
  const drawnIds = new Set(drawn.map((c) => c.id));
  // 따옴표는 JSON 문자열 안이라 \" 로 들어 있을 수 있다
  const quote = `(?:\\\\?["'‘’])?`;
  const named = (ko: string) => new RegExp(`(?:^|[^가-힣])${quote}${ko.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${quote}\\s?카드`).test(text);
  return DECK.filter((c) => !drawnIds.has(c.id) && (named(c.nameKo) || lower.includes(c.nameEn.toLowerCase()))).map((c) => c.nameKo);
}

// ── 별자리 운세 ──
export async function generateHoroscope(
  userId: string,
  target: { signId: string } | { month: number; day: number },
  opts: { regenerate: boolean; now?: Date },
) {
  let sign: ZodiacSign;
  let cuspNote: string | null = null;
  if ("signId" in target) {
    const s = signById(target.signId);
    if (!s) throw new AiError("AI_UNGROUNDED", "알 수 없는 별자리입니다.");
    sign = s;
  } else {
    ({ sign, cuspNote } = signFor(target.month, target.day));
  }
  const kst = new Date((opts.now ?? new Date()).getTime() + 9 * 3600_000);
  const date = kst.toISOString().slice(0, 10);
  const cacheKey = hmac(`horoscope:${userId}:${sign.id}:${date}:${PROMPT_VERSIONS.horoscope}`);
  if (!opts.regenerate) {
    const hit = await findReadingByCacheKey<HoroscopeReading & { sign: unknown; date: string }>(userId, cacheKey);
    if (hit && !isStaleMock(hit.provider)) return { id: hit.id, content: hit.content, cached: true, provider: hit.provider };
  }
  const r = await runAi<HoroscopeReading>({
    userId,
    kind: "horoscope",
    system: horoscopeSystemPrompt(),
    user: buildHoroscopePayload(sign, date, cuspNote),
    apiSchema: ApiHoroscopeReadingSchema,
    strictSchema: HoroscopeReadingSchema,
    maxTokens: 6000,
    mock: () => ({
      headline: `[모의 응답] ${sign.nameKo}의 오늘`,
      overall: `${sign.element} 원소의 ${sign.traits.join("·")} 성향을 바탕으로 한 예시 문장입니다.`,
      love: "관계에 대한 예시 문장입니다.",
      work: "일에 대한 예시 문장입니다.",
      money: "지출에 대한 예시 문장입니다.",
      tip: "가벼운 산책을 권합니다.",
      mood: MOODS[(sign.id.length + Number(date.slice(-2))) % MOODS.length],
      disclaimer: "오락과 참고용입니다.",
    }),
  });
  const content = { ...r.content, sign: { id: sign.id, nameKo: sign.nameKo, symbol: sign.symbol, element: sign.element }, date, cuspNote };
  const id = await saveReading(userId, { kind: "horoscope", calculationId: null, cacheKey, provider: r.provider, model: r.model, promptVersion: r.promptVersion, content });
  return { id, content, cached: false, provider: r.provider };
}
