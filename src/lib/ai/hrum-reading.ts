import "server-only";
import { z } from "zod";
import { getConfig } from "../config";
import { clip, dailyDialogueFallback, sajuDialogueFallback } from "../dialogue";
import { HrumError, hrumPost, logHrumError } from "../hrum/client";
import { assertAiAllowed } from "../limits";
import { logUsage } from "../repo/usage";
import type { SajuComputation } from "../saju/service";
import { AiError } from "./provider";
import { DailyReadingSchema, SajuReadingSchema, type DailyReading, type SajuReading } from "./schemas";

/**
 * 사주·오늘의 운세 풀이를 흐름(HRUM) AI 리딩으로 만든다 (2026-10-27 사용자 결정: Claude 대체).
 * 흐름 리딩은 자유 문장 하나만 돌려주므로(구조화 출력 없음) 장마다 질문을 나눠 동시에 묻고,
 * 답을 앱의 해석 구조(SajuReading·DailyReading)에 넣은 뒤 별이 대사·추천 질문은 앱 규칙(lib/dialogue)으로 만든다.
 * - 사주 풀이에는 생년월일 대신 확정 원국 네 기둥만 보낸다(saju 필드). 오늘의 운세(/today)는 흐름 규칙상 생년월일시가 필요하다
 * - 자미두수·점성술·꿈해몽·타로는 빼서(exclude) 항목별 추가 요금이 붙지 않게 한다
 * - 요금(원)은 사용량 기록·월 예산(달러)에 HRUM_KRW_PER_USD 환율로 넣는다
 */

export const HRUM_PROMPT_VERSIONS = { saju: "hrum-saju-2026-10-27.1", daily: "hrum-daily-2026-10-27.1" } as const;

/** 별이 말투 (흐름 persona: 말투에만 적용, 최대 2,000자) */
const PERSONA =
  "너는 운세 앱의 마스코트인 별빛 여우야. 다정한 반말로, 짧고 쉬운 문장으로 말해. 전문 용어는 처음 나올 때 한 번 쉽게 풀어 줘. " +
  "미래를 단정하지 말고 '~하는 흐름이야', '~해 보면 좋아'처럼 말해. 겁주는 말은 쓰지 마. " +
  "건강·법률·투자 결정은 판단하지 말고 전문가와 상의하라고 해. 오락과 자기 성찰을 위한 이야기라는 걸 잊지 마.";
const EXCLUDE = ["ziwei", "astro", "dream", "tarot"];
/** 흐름 리딩 출력 단가(원/100만 토큰, 부가세 포함) — 호출 전 최악의 비용 추정용 (흐름은 maxLength×2 토큰만큼 미리 잡는다) */
const OUTPUT_KRW_PER_MTOK = 25_410;
/** /today 요금(원, 부가세 포함). 응답에 차감액이 없을 때 기록용 */
const TODAY_KRW = 11;

const ReadingData = z.object({ interpretation: z.string(), costPoints: z.number().optional(), usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).partial().optional() }).passthrough();

type Pillars = SajuComputation["canonical"]["pillars"];
const pillarPayload = (p: Pillars) => {
  const one = (x: Pillars["day"]) => (x ? { stem: x.ganji[0], branch: x.ganji[1] } : undefined);
  return { year: one(p.year), month: one(p.month), day: one(p.day), ...(p.hour ? { hour: one(p.hour) } : {}) };
};

interface Spend {
  krw: number;
  inputTokens: number;
  outputTokens: number;
}

async function ask(question: string, maxLength: number, saju: ReturnType<typeof pillarPayload>, spend: Spend, fetchImpl?: typeof fetch): Promise<string> {
  const data = await hrumPost(
    "/reading",
    { question, saju, maxLength, tone: "casual", persona: PERSONA, exclude: EXCLUDE, speed: "fast" },
    { timeoutMs: getConfig().HRUM_READING_TIMEOUT_MS, fetchImpl },
  );
  const r = ReadingData.safeParse(data);
  if (!r.success || !r.data.interpretation.trim()) throw new HrumError("INVALID_RESPONSE", "흐름 리딩 응답 형식이 예상과 다릅니다.");
  spend.krw += r.data.costPoints ?? 0;
  spend.inputTokens += r.data.usage?.inputTokens ?? 0;
  spend.outputTokens += r.data.usage?.outputTokens ?? 0;
  return r.data.interpretation.trim();
}

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof HrumError) {
    if (e.code === "AUTH" || e.code === "DISABLED") return new AiError("AI_CONFIG", "풀이 서비스(흐름) 설정에 문제가 있습니다. 관리자에게 문의하세요.");
    if (e.code === "RATE_LIMITED") return new AiError("AI_RATE_LIMITED", "풀이 요청이 많아요. 잠시 후 다시 시도해 주세요.");
    if (e.code === "TIMEOUT") return new AiError("AI_TIMEOUT", "풀이 응답 시간이 초과되었습니다. 다시 시도해 주세요.");
    if (e.code === "INSUFFICIENT_BALANCE") return new AiError("AI_UPSTREAM_ERROR", "풀이 서비스 잔액이 부족합니다. 관리자에게 문의하세요.");
    if (e.code === "INVALID_RESPONSE") return new AiError("AI_SCHEMA_INVALID", "풀이 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.");
  }
  return new AiError("AI_UPSTREAM_ERROR", "풀이 서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
}

/** 한도·예산 확인 → 실행 → 사용량 기록 (출생 정보·질문 내용은 남기지 않는다) */
async function runHrum<T>(userId: string, kind: keyof typeof HRUM_PROMPT_VERSIONS, worstKrw: number, work: (spend: Spend) => Promise<T>) {
  const cfg = getConfig();
  const usd = (krw: number) => krw / cfg.HRUM_KRW_PER_USD;
  await assertAiAllowed(userId, usd(worstKrw));
  const spend: Spend = { krw: 0, inputTokens: 0, outputTokens: 0 };
  const started = performance.now();
  const log = (ok: boolean, errorCode: string | null) =>
    logUsage({
      userId,
      kind: "ai",
      provider: "hrum",
      model: "hrum-reading",
      inputTokens: spend.inputTokens,
      outputTokens: spend.outputTokens,
      costUsdEst: usd(spend.krw),
      durationMs: performance.now() - started,
      ok,
      errorCode,
      promptVersion: HRUM_PROMPT_VERSIONS[kind],
    });
  try {
    const out = await work(spend);
    await log(true, null);
    return out;
  } catch (e) {
    logHrumError(kind, e);
    const err = toAiError(e);
    await log(false, err.code);
    throw err;
  }
}

const worst = (lengths: number[]) => lengths.reduce((a, n) => a + (n * 2 * OUTPUT_KRW_PER_MTOK) / 1_000_000, 0) + 5 * lengths.length;

/** "강점: …" / "조심: …" 줄 나누기. 형식을 안 지켰으면 문장 단위로 나눠 앞은 강점, 뒤는 조심할 점 */
export function splitTraits(text: string): { strengths: string[]; cautions: string[] } {
  const lines = text.split(/\n+/).map((l) => l.replace(/^[\s\-•·*\d.)]+/, "").trim()).filter(Boolean);
  const pick = (re: RegExp) => lines.filter((l) => re.test(l)).map((l) => clip(l.replace(re, "").replace(/^[:：\s]+/, ""), 200)).filter(Boolean);
  let strengths = pick(/^강점/);
  let cautions = pick(/^(조심|주의)(할 ?점)?/);
  if (!strengths.length || !cautions.length) {
    const sentences = text.split(/(?<=[.!?。])\s+/).map((s) => clip(s.trim(), 200)).filter(Boolean);
    const half = Math.max(1, Math.ceil(sentences.length / 2));
    if (!strengths.length) strengths = sentences.slice(0, Math.min(half, 3));
    if (!cautions.length) cautions = sentences.slice(half, half + 2).length ? sentences.slice(half, half + 2) : [clip(text, 200)];
  }
  return { strengths: strengths.slice(0, 6), cautions: cautions.slice(0, 6) };
}

/** 사주 종합 풀이 */
export async function hrumSajuReading(
  userId: string,
  c: SajuComputation,
  opts: { focus: string[]; targetYear: number; yearGanji: string | null; fetchImpl?: typeof fetch },
): Promise<{ content: SajuReading; promptVersion: string }> {
  const saju = pillarPayload(c.canonical.pillars);
  const focusLine = opts.focus.length ? ` 특히 ${opts.focus.join(", ")}에 관심이 있어.` : "";
  const yearLabel = `${opts.targetYear}년${opts.yearGanji ? `(${opts.yearGanji}년)` : ""}`;
  const Q = {
    summary: [`내 사주의 가장 큰 특징을 2~3문장으로 요약해 줘.${focusLine}`, 300],
    personality: ["타고난 성격과 기질을 풀어 줘. 장점과 약점이 함께 드러나게.", 700],
    traits: ["타고난 강점 3가지와 조심할 점 2가지를 알려 줘. 각 줄을 '강점:' 또는 '조심:'으로 시작하는 한 줄로만 써 줘.", 400],
    career: ["어떤 일과 일하는 방식이 잘 맞는지 풀어 줘.", 600],
    wealth: ["재물을 모으고 쓰는 경향과 조언을 풀어 줘.", 500],
    relationships: ["연애와 인간관계에서의 모습과 조언을 풀어 줘.", 600],
    yearly: [`${yearLabel} 한 해의 흐름과 조심할 점을 풀어 줘.`, 600],
    action: ["지금 내 사주 흐름에서 해 보면 좋은 일 2~3가지를 알려 줘.", 400],
  } as const;
  return runHrum(userId, "saju", worst(Object.values(Q).map((q) => q[1])), async (spend) => {
    const keys = Object.keys(Q) as Array<keyof typeof Q>;
    const settled = await Promise.allSettled(keys.map((k) => ask(Q[k][0], Q[k][1], saju, spend, opts.fetchImpl)));
    const got = Object.fromEntries(keys.map((k, i) => [k, settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<string>).value : null])) as Record<keyof typeof Q, string | null>;
    // 강점·실천은 없어도 다른 답으로 채울 수 있다. 나머지 장이 비면 풀이를 저장하지 않는다
    const required: Array<keyof typeof Q> = ["summary", "personality", "career", "wealth", "relationships", "yearly"];
    const failed = required.find((k) => !got[k]);
    if (failed) throw (settled[keys.indexOf(failed)] as PromiseRejectedResult).reason;

    const dm = c.canonical.dayMaster;
    const traits = splitTraits(got.traits ?? got.personality!);
    const reading: SajuReading = {
      summary: clip(got.summary!, 600),
      personality: clip(got.personality!, 1500),
      strengths: traits.strengths,
      cautions: traits.cautions,
      career: clip(got.career!, 1200),
      wealth: clip(got.wealth!, 1200),
      relationships: clip(got.relationships!, 1200),
      yearlyOutlook: { year: opts.targetYear, yearGanji: opts.yearGanji, text: clip(got.yearly!, 1500) },
      evidence: [
        { claim: "풀이 기준", basis: `확정 원국 ${(["year", "month", "day", "hour"] as const).map((f) => c.canonical.pillars[f]?.ganji ?? "-").join(" ")}` },
        ...(dm ? [{ claim: "일간", basis: `일간 ${dm.stem}(${dm.element})` }] : []),
      ],
      limitations: c.canonical.pillars.hour ? [] : ["태어난 시각을 몰라 시주 없이 풀었어요."],
      disclaimer: "운세는 오락과 자기 성찰을 위한 참고 정보예요. 풀이: 흐름(HRUM) AI.",
    };
    const dialogue = sajuDialogueFallback(reading, { day: c.canonical.pillars.day, dayMaster: dm, elements: c.canonical.elements });
    if (got.action) dialogue.suggestions[1] = { kind: "action", question: "그럼 지금 뭘 해 보면 좋아?", answer: clip(got.action, 380) };
    const content = { ...reading, dialogue };
    const parsed = SajuReadingSchema.safeParse(content);
    if (!parsed.success) throw new AiError("AI_SCHEMA_INVALID", "풀이를 화면 형식으로 정리하지 못했습니다. 다시 시도해 주세요.");
    return { content: parsed.data, promptVersion: HRUM_PROMPT_VERSIONS.saju };
  });
}

const TodaySchema = z
  .object({
    summary: z
      .object({
        today_ganji: z.string().optional(),
        day_master: z.string().optional(),
        today_sipsin: z.string().optional(),
        daily_flow: z.string().optional(),
        flow_tier: z.string().optional(),
      })
      .passthrough()
      .optional(),
    omen: z
      .object({
        relation: z.object({ label: z.string().optional() }).passthrough().optional(),
        color: z.object({ name: z.string().optional(), ohaeng: z.string().optional() }).passthrough().optional(),
        food: z.string().optional(),
        keyword: z.string().optional(),
        message: z.string().optional(),
        luckyHour: z.string().optional(),
        avoidHour: z.string().optional(),
        activity: z.string().optional(),
      })
      .passthrough(),
    costPoints: z.number().optional(),
  })
  .passthrough();
export type HrumToday = z.infer<typeof TodaySchema>;

/** 흐름 오늘의 흐름 등급 → 별이 분위기 */
export function moodFromFlowTier(tier: string | undefined): DailyReading["mood"] {
  const t = (tier ?? "").toLowerCase();
  if (/great|best|excellent/.test(t)) return "great";
  if (/good/.test(t)) return "good";
  if (/bad|caution|low|poor|warn/.test(t)) return "careful";
  return "calm";
}

/** 오늘의 운세: /today 계산값(일진·행운 색·음식·시간·추천 활동)을 근거로, 분야별 문장은 흐름 리딩으로 */
export async function hrumDailyReading(
  userId: string,
  c: SajuComputation,
  birth: { year: number; month: number; day: number; hour: number | null; minute: number | null; gender: "male" | "female" | null },
  date: string,
  fetchImpl?: typeof fetch,
): Promise<{ content: DailyReading; promptVersion: string }> {
  const saju = pillarPayload(c.canonical.pillars);
  const lengths = [250, 250, 250];
  return runHrum(userId, "daily", worst(lengths) + TODAY_KRW, async (spend) => {
    const body: Record<string, unknown> = { year: birth.year, month: birth.month, day: birth.day, timezone: "Asia/Seoul", gender: birth.gender ?? "male", date };
    if (birth.hour !== null) {
      body.hour = birth.hour;
      body.minute = birth.minute ?? 0;
    }
    const todayRaw = await hrumPost("/today", body, { fetchImpl });
    const t = TodaySchema.safeParse(todayRaw);
    if (!t.success) throw new HrumError("INVALID_RESPONSE", "흐름 오늘의 사주 응답 형식이 예상과 다릅니다.");
    spend.krw += t.data.costPoints ?? TODAY_KRW;
    const s = t.data.summary ?? {};
    const o = t.data.omen;
    const dayLabel = `오늘(${date}${s.today_ganji ? `, ${s.today_ganji}일` : ""})`;
    const [love, work, luck] = await Promise.all([
      ask(`${dayLabel} 연애와 인간관계 흐름을 2~3문장으로 알려 줘.`, lengths[0], saju, spend, fetchImpl),
      ask(`${dayLabel} 일과 공부 흐름을 2~3문장으로 알려 줘.`, lengths[1], saju, spend, fetchImpl),
      ask(`${dayLabel} 금전과 행운 흐름을 2~3문장으로 알려 줘.`, lengths[2], saju, spend, fetchImpl),
    ]);
    const message = o.message ?? s.daily_flow ?? "오늘은 내 속도대로 가 보는 날이야.";
    const reading: DailyReading = {
      headline: clip(o.relation?.label ?? o.keyword ?? "오늘의 흐름", 40),
      highlights: [
        { emoji: "🌤️", text: clip(s.daily_flow ?? message, 80) },
        ...(o.luckyHour ? [{ emoji: "⏰", text: clip(`좋은 시간 ${o.luckyHour}${o.avoidHour ? ` · 피할 시간 ${o.avoidHour}` : ""}`, 80) }] : []),
        ...(o.activity ? [{ emoji: "✨", text: clip(`추천: ${o.activity}`, 80) }] : []),
      ],
      love: clip(love, 500),
      work: clip(work, 500),
      luck: clip(luck, 500),
      food: { name: clip(o.food ?? "따뜻한 한 끼", 30), reason: clip(`오늘의 기운${o.color?.ohaeng ? `(${o.color.ohaeng})` : ""}에 맞춘 추천이에요. 재미로 챙겨 봐!`, 200) },
      lucky: { color: clip(o.color?.name ?? "보라", 20), item: clip(`${o.color?.name ?? "보라"}색 소품`, 30) },
      tip: clip(message, 300),
      evidence: [
        {
          claim: o.relation?.label ?? "오늘의 일진",
          basis: clip(`오늘 일진 ${s.today_ganji ?? "-"}${s.day_master ? `, 일간 ${s.day_master}` : ""}${s.today_sipsin ? ` 기준 ${s.today_sipsin}` : ""} (흐름 계산)`, 300),
        },
      ],
      mood: moodFromFlowTier(s.flow_tier),
      disclaimer: "오락과 참고용이에요. 풀이: 흐름(HRUM).",
    };
    const dialogue = dailyDialogueFallback(reading);
    if (o.activity) dialogue.step = { action: clip(o.activity, 60), why: clip(message, 200) };
    const parsed = DailyReadingSchema.safeParse({ ...reading, dialogue });
    if (!parsed.success) throw new AiError("AI_SCHEMA_INVALID", "운세를 화면 형식으로 정리하지 못했습니다. 다시 시도해 주세요.");
    return { content: parsed.data, promptVersion: HRUM_PROMPT_VERSIONS.daily };
  });
}
