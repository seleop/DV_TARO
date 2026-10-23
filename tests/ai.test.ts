import { beforeEach, describe, expect, it } from "vitest";
import { findUngroundedGanji, generateDailyReading, generateHoroscope, generateSajuReading, generateTarotReading } from "@/lib/ai/interpret";
import { MockProvider, setAiProviderForTests, type GenerateRequest } from "@/lib/ai/provider";
import { SajuReadingSchema } from "@/lib/ai/schemas";
import { estimateCostUsd } from "@/lib/ai/cost";
import { buildSajuPayload } from "@/lib/ai/prompts";
import { LimitError } from "@/lib/limits";
import { getCalculation, saveCalculation } from "@/lib/repo/records";
import { logUsage } from "@/lib/repo/usage";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju } from "@/lib/saju/service";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { signFor } from "@/lib/horoscope/zodiac";
import { DECK, drawCards } from "@/lib/tarot/deck";
import { freshEnv, makeUser, rawPg } from "./helpers/db";

const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];

async function storedCalc(userId: string, extra: Record<string, unknown> = {}) {
  const input = parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30, gender: "male", ...extra });
  const c = await calculateSaju(userId, input, { engines: LOCAL, jeombomEnabled: false });
  return (await getCalculation(userId, await saveCalculation(userId, input, c, null)))!;
}

const usageRows = async () => (await (await rawPg()).query<Record<string, unknown>>("select kind, ok, error_code, cost_usd_est, user_anon, prompt_version from public.usage_logs order by id")).rows;
const readingCount = async () => (await (await rawPg()).query<{ c: number }>("select count(*)::int as c from public.fortune_readings")).rows[0].c;

describe("AI 입력 데이터", () => {
  beforeEach(async () => freshEnv());

  it("생년월일·출생 시각·이름을 넣지 않고 확정 원국과 검증 상태만 넣는다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const payload = buildSajuPayload(calc.result, { gender: "male", dayBoundary: "midnight", targetYear: 2026, yearGanji: "병오", focus: ["직업"] });
    expect(payload).toContain("일주: 계유(癸酉)");
    expect(payload).toContain("검증 상태:");
    expect(payload).not.toMatch(/1992|10월 24|05:30|사용자/);
  });

  it("미확정 기둥은 '미확정'으로 표시한다", async () => {
    const u = await makeUser();
    const input = parseBirthInput({ calendar: "solar", year: 2024, month: 2, day: 4, timeKnown: false });
    const c = await calculateSaju(u.id, input, { engines: LOCAL, jeombomEnabled: false });
    const payload = buildSajuPayload(c, { gender: null, dayBoundary: "midnight", targetYear: 2026, yearGanji: null, focus: [] });
    expect(payload).toContain("년주: 미확정");
    expect(payload).toContain("시주: 없음(출생 시각 미상)");
  });
});

describe("AI 해석 생성 (모의 공급자)", () => {
  beforeEach(async () => freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "10", LIMIT_AI_PER_USER_PER_DAY: "20", BUDGET_MONTHLY_USD: "20" }));

  it("사주 해석을 스키마대로 생성·암호화 저장하고 사용량을 익명으로 기록한다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const r = await generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 });
    expect(SajuReadingSchema.safeParse(r.content).success).toBe(true);
    expect(r.content.yearlyOutlook.yearGanji).toBe("병오");
    const rows = await usageRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "ai", ok: true, error_code: null, prompt_version: "saju-2026-10-23.1" });
    expect(rows[0].user_anon).not.toBe(u.id);
  });

  it("AI JSON 스키마 검증 실패 → 저장하지 않고 AI_SCHEMA_INVALID 기록", async () => {
    setAiProviderForTests(new MockProvider(() => ({ summary: "필드 누락" })));
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    await expect(generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 })).rejects.toMatchObject({ code: "AI_SCHEMA_INVALID" });
    expect(await readingCount()).toBe(0);
    expect((await usageRows())[0]).toMatchObject({ ok: false, error_code: "AI_SCHEMA_INVALID" });
  });

  it("길이 제한을 넘는 필드도 검증 실패로 처리", async () => {
    setAiProviderForTests(
      new MockProvider((req: GenerateRequest<unknown>) => ({ ...(req.mock() as object), summary: "가".repeat(5000) })),
    );
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    await expect(generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 })).rejects.toMatchObject({ code: "AI_SCHEMA_INVALID" });
  });

  it("AI가 입력에 없는 간지를 지어내면 저장하지 않는다 (AI_UNGROUNDED)", async () => {
    setAiProviderForTests(
      new MockProvider((req: GenerateRequest<unknown>) => ({ ...(req.mock() as object), career: "갑자(甲子) 대운에 크게 성공합니다." })),
    );
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    await expect(generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 })).rejects.toMatchObject({ code: "AI_UNGROUNDED" });
  });

  it("근거 검사: 확정된 간지는 허용하고, 일반 단어(기사·임자)는 오탐하지 않는다", () => {
    const allowed = new Set(["계유", "임신"]);
    expect(findUngroundedGanji({ t: "계유(癸酉) 일주와 임신년주" }, allowed)).toEqual([]);
    expect(findUngroundedGanji({ t: "신문 기사를 읽은 임자가 웃었다" }, allowed)).toEqual([]);
    expect(findUngroundedGanji({ t: "경오(庚午) 시주" }, allowed)).toEqual(["경오"]);
    expect(findUngroundedGanji({ t: "병인 대운" }, allowed)).toEqual(["병인"]);
  });

  it("일주가 미확정이면 AI를 호출하지 않는다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    calc.result.canonical.pillars.day = null;
    await expect(generateSajuReading(u.id, calc, { focus: [], targetYear: 2026 })).rejects.toMatchObject({ code: "AI_UNGROUNDED" });
    expect(await usageRows()).toHaveLength(0);
  });

  it("오늘의 운세는 같은 날 캐시되고, 재생성하면 새로 만든다", async () => {
    const u = await makeUser();
    const calc = await storedCalc(u.id);
    const now = new Date(Date.UTC(2024, 0, 1, 3));
    const a = await generateDailyReading(u.id, calc, { regenerate: false, now });
    expect(a.today).toMatchObject({ day: "갑자", tenGod: "상관" }); // 일간 계 vs 갑 = 상관
    expect(a.reading.content.highlights.length).toBeGreaterThan(0);
    expect(a.reading.content.food.name).toBeTruthy();
    const b = await generateDailyReading(u.id, calc, { regenerate: false, now });
    expect(b.cached).toBe(true);
    expect(b.today.tenGod).toBe("상관");
    expect(b.reading.id).toBe(a.reading.id);
    const c = await generateDailyReading(u.id, calc, { regenerate: true, now });
    expect(c.reading.id).not.toBe(a.reading.id);
    expect(await usageRows()).toHaveLength(2);
  });

  it("타로: 서버가 뽑은 카드만 해석하고, 다른 카드명을 쓰면 거부", async () => {
    const u = await makeUser();
    const r = await generateTarotReading(u.id, "이번 프로젝트 잘 될까요?", "three");
    expect(r.content.drawn).toHaveLength(3);
    expect(new Set(r.content.drawn.map((c) => c.id)).size).toBe(3);
    setAiProviderForTests(
      new MockProvider((req: GenerateRequest<unknown>) => {
        const d = req.mock() as { cards: Array<{ cardName: string }> };
        d.cards[0].cardName = "존재하지 않는 카드";
        return d;
      }),
    );
    await expect(generateTarotReading(u.id, "질문", "one")).rejects.toMatchObject({ code: "AI_UNGROUNDED" });
  });

  it("별자리: 같은 날 캐시", async () => {
    const u = await makeUser();
    const now = new Date(Date.UTC(2026, 9, 23, 3));
    const a = await generateHoroscope(u.id, { month: 10, day: 24 }, { regenerate: false, now });
    const bySign = await generateHoroscope(u.id, { signId: "leo" }, { regenerate: false, now });
    expect(bySign.content.sign).toMatchObject({ id: "leo" });
    expect(a.content.sign).toMatchObject({ id: "scorpio" });
    const b = await generateHoroscope(u.id, { month: 10, day: 24 }, { regenerate: false, now });
    expect(b.cached).toBe(true);
  });
});

describe("호출 제한과 예산 상한", () => {
  it("사용자별 분당 한도를 넘으면 LimitError (다른 사용자는 영향 없음)", async () => {
    await freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "2", LIMIT_AI_PER_USER_PER_DAY: "100", BUDGET_MONTHLY_USD: "100" });
    const u = await makeUser();
    const other = await makeUser();
    await generateTarotReading(u.id, "q1", "one");
    await generateTarotReading(u.id, "q2", "one");
    await expect(generateTarotReading(u.id, "q3", "one")).rejects.toMatchObject({ code: "RATE_LIMIT_MINUTE" });
    await expect(generateTarotReading(other.id, "q", "one")).resolves.toBeTruthy();
  });

  it("사용자별 일일 한도", async () => {
    await freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "100", LIMIT_AI_PER_USER_PER_DAY: "1", BUDGET_MONTHLY_USD: "100" });
    const u = await makeUser();
    await generateTarotReading(u.id, "q1", "one");
    const err = await generateTarotReading(u.id, "q2", "one").catch((e) => e);
    expect(err).toBeInstanceOf(LimitError);
    expect(err.code).toBe("RATE_LIMIT_DAY");
  });

  it("월 예산을 넘으면 전체 사용자 AI 호출을 막는다", async () => {
    await freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "100", LIMIT_AI_PER_USER_PER_DAY: "100", BUDGET_MONTHLY_USD: "1" });
    const u = await makeUser();
    await logUsage({ userId: "someone-else", kind: "ai", provider: "anthropic", model: "claude-opus-5-5", costUsdEst: 0.999, ok: true });
    // 모의 공급자 단가는 0이지만 예산이 이미 거의 소진됨 → 비용 0이므로 통과
    await expect(generateTarotReading(u.id, "q", "one")).resolves.toBeTruthy();
    await logUsage({ userId: "someone-else", kind: "ai", provider: "anthropic", model: "claude-opus-5-5", costUsdEst: 0.01, ok: true });
    await expect(generateTarotReading(u.id, "q", "one")).rejects.toMatchObject({ code: "BUDGET_EXCEEDED" });
  });

  it("비용 추정: 알려진 모델은 단가표, 모르는 모델은 보수적 단가", () => {
    expect(estimateCostUsd("claude-opus-5-5", 1_000_000, 1_000_000)).toEqual({ usd: 24, known: true });
    expect(estimateCostUsd("unknown-model", 1_000_000, 0)).toEqual({ usd: 10, known: false });
  });
});

describe("타로·별자리 데이터", () => {
  it("덱은 78장이고 id가 중복되지 않는다", () => {
    expect(DECK).toHaveLength(78);
    expect(new Set(DECK.map((c) => c.id)).size).toBe(78);
  });

  it("주입한 난수로 결정적으로 뽑을 수 있다 (중복 없음)", () => {
    const cards = drawCards("three", () => 0);
    expect(cards.map((c) => c.id)).toEqual(["major-0", "major-1", "major-2"]);
    expect(cards.every((c) => !c.reversed)).toBe(true);
  });

  it.each([
    [1, 1, "capricorn"],
    [1, 20, "aquarius"],
    [3, 21, "aries"],
    [7, 22, "cancer"],
    [7, 23, "leo"],
    [12, 21, "sagittarius"],
    [12, 31, "capricorn"],
  ])("%i월 %i일 → %s", (m, d, id) => {
    expect(signFor(m, d).sign.id).toBe(id);
  });

  it("경계일에는 안내 문구", () => {
    expect(signFor(3, 21).cuspNote).not.toBeNull();
    expect(signFor(4, 5).cuspNote).toBeNull();
  });
});
