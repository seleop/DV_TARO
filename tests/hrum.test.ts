import { beforeEach, describe, expect, it } from "vitest";
import { generateDailyReading, generateSajuReading } from "@/lib/ai/interpret";
import { moodFromFlowTier, splitTraits } from "@/lib/ai/hrum-reading";
import { DailyReadingSchema, SajuReadingSchema } from "@/lib/ai/schemas";
import { isConsentExemptPath } from "@/lib/auth/next-path";
import { PRIVACY_CONSENT } from "@/config/privacy";
import { hrumAllowedFor, needsPrivacyConsent } from "@/lib/privacy-consent";
import { getCalculation, saveCalculation } from "@/lib/repo/records";
import { getProfile, recordPrivacyConsent } from "@/lib/repo/users";
import { hrumRequest, seoulIsUtc9 } from "@/lib/saju/engines/hrum";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju, computeCacheKey, defaultEngines } from "@/lib/saju/service";
import type { BirthInput, EngineInput } from "@/lib/saju/types";
import { freshEnv, makeUser, rawPg } from "./helpers/db";

/**
 * 흐름(HRUM) 연결 (2026-10-27 사용자 결정: 세 엔진 교차검증 철회, 흐름 단일 출처 + Claude 대체).
 * 네트워크 대신 가짜 fetch로 흐름 응답(공식 문서 예시 형식)을 흉내 낸다.
 */

type Call = { url: string; body: Record<string, unknown> };
function fakeHrum(reply: (path: string, body: Record<string, unknown>) => { status?: number; json: unknown }) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ url, body });
    const r = reply(url.replace(/^.*\/partners\/v1/, ""), body);
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { impl, calls };
}

/** 같은 입력으로 앱 내장 엔진이 낸 원국을 흐름 응답 모양으로 (흐름과 내장 엔진이 같은 값을 냈다고 가정) */
async function manseryeokAsHrum(input: EngineInput) {
  const r = manseryeokEngine.normalize(await manseryeokEngine.calculate(input, { fetchImpl: fetch, timeoutMs: 1000, maxRetries: 0 }), input);
  const p = (f: "year" | "month" | "day" | "hour") => (r.pillars[f] ? { stem: r.pillars[f]!.stem, branch: r.pillars[f]!.branch, stemSipsin: f === "day" ? "비견" : "정관" } : null);
  return {
    success: true,
    data: {
      wonkuk: { year: p("year"), month: p("month"), day: p("day"), hour: p("hour") },
      daeun: (r.daewoon?.pillars ?? []).map((g, i) => ({ stem: g[0], branch: g[1], startAge: 3 + i * 10 })),
      daeunNumber: r.daewoon?.start?.years ?? 3,
      daeunDirection: r.daewoon?.forward ? "순행" : "역행",
      strength: { result: "신약" },
      yongshin: "수",
    },
  };
}

const birth = (extra: Record<string, unknown> = {}): BirthInput =>
  parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30, gender: "male", ...extra });

const baseInput = (b: BirthInput): EngineInput => ({
  solarDate: { year: b.year, month: b.month, day: b.day },
  termTime: { year: b.year, month: b.month, day: b.day, hour: b.hour ?? 0, minute: b.minute ?? 0 },
  pillarTime: { year: b.year, month: b.month, day: b.day, hour: b.hour ?? 0, minute: b.minute ?? 0 },
  timeKnown: b.timeKnown,
  dayBoundary: b.settings.dayBoundary,
  gender: b.gender,
  lunarSource: null,
});

describe("흐름 만세력 요청 만들기", () => {
  it("서울 시간이 UTC+9가 아니던 시기는 고정 UTC+9 시간대로 보낸다", () => {
    expect(seoulIsUtc9({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 })).toBe(true);
    expect(seoulIsUtc9({ year: 1958, month: 3, day: 1, hour: 12, minute: 0 })).toBe(false); // UTC+8:30 시기
    expect(seoulIsUtc9({ year: 1988, month: 7, day: 1, hour: 12, minute: 0 })).toBe(false); // 서머타임
    const i = baseInput(birth());
    expect(hrumRequest(i.termTime, i)).toMatchObject({ timezone: "Asia/Seoul", hour: 5, minute: 30, gender: "male", calendar: "solar", zaSiRule: "traditional" });
    expect(hrumRequest({ year: 1958, month: 3, day: 1, hour: 12, minute: 0 }, i).timezone).toBe("Etc/GMT-9");
  });

  it("야자시 관법은 yajaSi, 시간 미상은 시각 없이, 성별 미입력은 male 로(대운은 쓰지 않음)", () => {
    const split = baseInput(birth({ settings: { dayBoundary: "splitJasi" } }));
    expect(hrumRequest(split.termTime, split).zaSiRule).toBe("yajaSi");
    const unknown = baseInput(birth({ timeKnown: false, hour: undefined, minute: undefined, gender: null }));
    const body = hrumRequest(unknown.termTime, unknown);
    expect(body).not.toHaveProperty("hour");
    expect(body.gender).toBe("male");
  });
});

describe("흐름 단일 출처 원국 계산", () => {
  beforeEach(async () => freshEnv({ HRUM_API_KEY: "hrum-test-key" }));

  it("흐름 값을 그대로 확정 원국으로 쓰고(교차검증 없음) 출처를 남긴다", async () => {
    const u = await makeUser();
    const b = birth();
    const sample = await manseryeokAsHrum(baseInput(b));
    const { impl, calls } = fakeHrum(() => ({ json: sample }));
    const c = await calculateSaju(u.id, b, { useHrum: true, ctx: { fetchImpl: impl } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.hrum.ai/api/v1/partners/v1/manseryeok");
    expect(c.engines.map((e) => e.id)).toEqual(["hrum"]);
    expect(c.status).toBe("MATCH");
    expect(c.canonical.pillars.day?.ganji).toBe("계유");
    expect(c.canonical.daewoon?.forward).toBeDefined();
    expect(c.attributions[0]).toContain("흐름");
    expect(c.cacheKey).toBe(computeCacheKey(u.id, b, defaultEngines(true).map((e) => e.getEngineMetadata())));
  });

  it("시간 미상이면 하루의 시작·끝 두 번 대신 날짜만으로 한 번 호출한다(같은 요청은 한 번만 과금)", async () => {
    const u = await makeUser();
    const b = birth({ timeKnown: false, hour: undefined, minute: undefined });
    const sample = await manseryeokAsHrum(baseInput(b));
    const { impl, calls } = fakeHrum(() => ({ json: sample }));
    const c = await calculateSaju(u.id, b, { useHrum: true, ctx: { fetchImpl: impl } });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).not.toHaveProperty("hour");
    expect(c.canonical.pillars.hour).toBeNull();
  });

  it("흐름이 응답하지 못하면 앱 내장 엔진으로 계산하고, 그 결과는 흐름 기준 캐시에 넣지 않는다", async () => {
    const u = await makeUser();
    const b = birth();
    const { impl, calls } = fakeHrum(() => ({ status: 503, json: { success: false, statusCode: 503, code: "SERVICE_DEGRADED" } }));
    const c = await calculateSaju(u.id, b, { useHrum: true, ctx: { fetchImpl: impl, maxRetries: 1 } });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(c.status).toBe("MATCH");
    expect(c.canonical.pillars.day?.ganji).toBe("계유");
    expect(c.resolutionLog.join(" ")).toContain("흐름 계산 실패");
    expect(c.cacheKey).not.toBe(computeCacheKey(u.id, b, defaultEngines(true).map((e) => e.getEngineMetadata())));
  });

  it("23시대 출생 + 기본 자시 관법(midnight)은 흐름에 같은 규칙이 없어 호출 없이 내장 엔진으로", async () => {
    const u = await makeUser();
    const { impl, calls } = fakeHrum(() => ({ json: {} }));
    const c = await calculateSaju(u.id, birth({ hour: 23, minute: 30 }), { useHrum: true, ctx: { fetchImpl: impl } });
    expect(calls).toHaveLength(0);
    expect(c.canonical.pillars.hour).not.toBeNull();
    expect(c.resolutionLog.join(" ")).toContain("SETTINGS_MISMATCH");
  });

  it("흐름이 시간대를 못 알아들었다고 하면(UNKNOWN_TIMEZONE) 그 값을 쓰지 않는다", async () => {
    const u = await makeUser();
    const b = birth();
    const sample = await manseryeokAsHrum(baseInput(b));
    const { impl } = fakeHrum(() => ({ json: { ...sample, data: { ...sample.data, warnings: [{ code: "UNKNOWN_TIMEZONE", field: "timezone" }] } } }));
    const c = await calculateSaju(u.id, b, { useHrum: true, ctx: { fetchImpl: impl } });
    expect(c.resolutionLog.join(" ")).toContain("흐름 계산 실패");
  });

  it("흐름을 쓰지 않으면(동의 전·키 없음) 내장 엔진 하나로 계산한다", async () => {
    const u = await makeUser();
    const c = await calculateSaju(u.id, birth(), {});
    expect(c.engines.map((e) => e.id)).toEqual(["manseryeok"]);
    expect(c.status).toBe("MATCH");
    expect(defaultEngines(false).map((e: SajuEngine) => e.getEngineMetadata().id)).toEqual(["manseryeok"]);
  });
});

describe("흐름 풀이 (Claude 대체)", () => {
  beforeEach(async () => freshEnv({ HRUM_API_KEY: "hrum-test-key", LIMIT_AI_PER_USER_PER_MINUTE: "20", LIMIT_AI_PER_USER_PER_DAY: "50", BUDGET_MONTHLY_USD: "20" }));

  async function stored(userId: string) {
    const b = birth();
    const c = await calculateSaju(userId, b, {});
    return (await getCalculation(userId, await saveCalculation(userId, b, c, null)))!;
  }

  const readingReply = (body: Record<string, unknown>) => {
    const q = String(body.question);
    const text = q.includes("'강점:'")
      ? "강점: 섬세하게 마음을 읽어요\n강점: 꾸준해요\n강점: 정리를 잘해요\n조심: 혼자 끙끙 앓기\n조심: 시작이 늦어요"
      : `${q.slice(0, 20)}에 대한 흐름 풀이 문장이에요. 차분히 가 보면 좋아.`;
    return { json: { success: true, data: { interpretation: text, sajuSource: "provided", usage: { inputTokens: 30, outputTokens: 120 }, costPoints: 4 } } };
  };

  it("사주 풀이: 장마다 질문을 나눠 묻고(생년월일 대신 네 기둥만), 별이 대사·추천 질문까지 화면 형식으로 정리한다", async () => {
    const u = await makeUser();
    const calc = await stored(u.id);
    const { impl, calls } = fakeHrum((_p, body) => readingReply(body));
    const r = await generateSajuReading(u.id, calc, { focus: ["직업"], targetYear: 2026, useHrum: true, fetchImpl: impl });
    expect(r.provider).toBe("hrum");
    expect(SajuReadingSchema.safeParse(r.content).success).toBe(true);
    expect(r.content.strengths).toEqual(["섬세하게 마음을 읽어요", "꾸준해요", "정리를 잘해요"]);
    expect(r.content.cautions).toHaveLength(2);
    expect(r.content.dialogue?.suggestions[1].answer).toContain("흐름 풀이");
    expect(calls.length).toBe(8);
    for (const c of calls) {
      expect(c.url).toMatch(/\/reading$/);
      expect(c.body).toMatchObject({ saju: { day: { stem: "계", branch: "유" } }, exclude: ["ziwei", "astro", "dream", "tarot"], tone: "casual" });
      expect(c.body).not.toHaveProperty("birth");
      expect(JSON.stringify(c.body)).not.toMatch(/\b1992\b/);
    }
    const log = (await (await rawPg()).query<Record<string, unknown>>("select provider, ok, cost_usd_est from public.usage_logs order by id desc limit 1")).rows[0];
    expect(log).toMatchObject({ provider: "hrum", ok: true });
    expect(Number(log.cost_usd_est)).toBeCloseTo((8 * 4) / 1400, 6);
  });

  it("필수 장 하나라도 실패하면 저장하지 않고, 흐름 오류를 사용자용 오류로 바꾼다", async () => {
    const u = await makeUser();
    const calc = await stored(u.id);
    const { impl } = fakeHrum((_p, body) => (String(body.question).includes("재물") ? { status: 402, json: { success: false, statusCode: 402, code: "INSUFFICIENT_BALANCE" } } : readingReply(body)));
    await expect(generateSajuReading(u.id, calc, { focus: [], targetYear: 2026, useHrum: true, fetchImpl: impl })).rejects.toMatchObject({ code: "AI_UPSTREAM_ERROR" });
    expect((await (await rawPg()).query<{ c: number }>("select count(*)::int as c from public.fortune_readings")).rows[0].c).toBe(0);
  });

  it("오늘의 운세: 흐름 /today 계산값(관계·색·음식·시간·추천 활동)을 근거로 쓰고 같은 날은 다시 쓴다", async () => {
    const u = await makeUser();
    const calc = await stored(u.id);
    const today = {
      success: true,
      data: {
        date: "2024-01-01",
        summary: { today_ganji: "갑자", day_master: "계", today_sipsin: "상관", flow_tier: "good", daily_flow: "오늘은 표현이 잘 풀리는 흐름이야." },
        omen: { relation: { type: "SAENG", label: "표현의 날" }, color: { name: "초록", hex: "#3a7", ohaeng: "목" }, food: "나물비빔밥", keyword: "표현", message: "말 한마디가 분위기를 바꿔요.", luckyHour: "오전 9시 ~ 11시", avoidHour: "밤 11시 이후", activity: "고마운 사람에게 연락하기" },
        taskAffinity: [],
      },
    };
    const { impl, calls } = fakeHrum((path, body) => (path === "/today" ? { json: today } : readingReply(body)));
    const now = new Date(Date.UTC(2024, 0, 1, 3));
    const a = await generateDailyReading(u.id, calc, { regenerate: false, now, useHrum: true, fetchImpl: impl });
    expect(a.reading.provider).toBe("hrum");
    const r = a.reading.content;
    expect(DailyReadingSchema.safeParse(r).success).toBe(true);
    expect(r).toMatchObject({ headline: "표현의 날", food: { name: "나물비빔밥" }, lucky: { color: "초록" }, mood: "good" });
    expect(r.highlights.map((h) => h.text).join(" ")).toContain("오전 9시");
    expect(r.dialogue?.step.action).toBe("고마운 사람에게 연락하기");
    const todayCall = calls.find((c) => c.url.endsWith("/today"))!;
    expect(todayCall.body).toMatchObject({ year: 1992, month: 10, day: 24, hour: 5, minute: 30, timezone: "Asia/Seoul", gender: "male", date: "2024-01-01" });
    expect(calls.filter((c) => c.url.endsWith("/reading"))).toHaveLength(3);
    const b = await generateDailyReading(u.id, calc, { regenerate: false, now, useHrum: true, fetchImpl: impl });
    expect(b.cached).toBe(true);
    expect(calls).toHaveLength(4);
  });

  it("강점·조심 줄 형식을 안 지켜도 문장으로 나눠 채운다, 흐름 등급 → 별이 분위기", () => {
    const t = splitTraits("섬세해요. 꾸준해요. 혼자 앓아요. 시작이 늦어요.");
    expect(t.strengths.length).toBeGreaterThan(0);
    expect(t.cautions.length).toBeGreaterThan(0);
    expect(moodFromFlowTier("great")).toBe("great");
    expect(moodFromFlowTier("good")).toBe("good");
    expect(moodFromFlowTier("caution")).toBe("careful");
    expect(moodFromFlowTier(undefined)).toBe("calm");
  });
});

describe("개인정보 고지 재동의", () => {
  beforeEach(async () => freshEnv({ HRUM_API_KEY: "hrum-test-key" }));

  it("예전 버전에 동의한 가입자는 다시 동의해야 하고, 동의 전에는 흐름으로 보내지 않는다", async () => {
    const u = await makeUser();
    expect(u.privacyVersion).toBeNull();
    expect(needsPrivacyConsent(u)).toBe(true);
    expect(hrumAllowedFor(u)).toBe(false);
    await recordPrivacyConsent(u.id, PRIVACY_CONSENT.version);
    const after = (await getProfile(u.id))!;
    expect(after.privacyVersion).toBe(PRIVACY_CONSENT.version);
    expect(hrumAllowedFor(after)).toBe(true);
    await freshEnv({});
    expect(hrumAllowedFor(after)).toBe(false); // 키가 없으면 흐름을 쓰지 않는다
  });

  it("재동의 전에도 동의 화면과 MY(로그아웃·계정 삭제)는 들어갈 수 있다", () => {
    expect(isConsentExemptPath("/consent?next=%2Ftoday")).toBe(true);
    expect(isConsentExemptPath("/me")).toBe(true);
    expect(isConsentExemptPath("/today")).toBe(false);
    expect(isConsentExemptPath("/saju/abc")).toBe(false);
  });
});
