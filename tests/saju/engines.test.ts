import { describe, expect, it } from "vitest";
import { jeombomEngine } from "@/lib/saju/engines/jeombom";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import { EngineError, type EngineContext, type SajuEngine } from "@/lib/saju/engines/types";
import { pillarToString } from "@/lib/saju/ganji";
import type { DayBoundary, EngineInput, WallTime } from "@/lib/saju/types";
import { createJeombomMock } from "../helpers/jeombom-mock";
import { REFERENCE_CASES } from "../fixtures/reference-cases";

const ctx = (fetchImpl: typeof fetch = fetch, timeoutMs = 2000, maxRetries = 0): EngineContext => ({ fetchImpl, timeoutMs, maxRetries });

function mkInput(w: WallTime, opts: { timeKnown?: boolean; dayBoundary?: DayBoundary; gender?: "male" | "female" | null } = {}): EngineInput {
  return {
    solarDate: { year: w.year, month: w.month, day: w.day },
    termTime: w,
    pillarTime: w,
    timeKnown: opts.timeKnown ?? true,
    dayBoundary: opts.dayBoundary ?? "midnight",
    gender: opts.gender ?? null,
    lunarSource: null,
  };
}

async function run(engine: SajuEngine, input: EngineInput, c = ctx()) {
  const raw = await engine.calculate(input, c);
  const n = engine.normalize(raw, input);
  expect(engine.validate(n, input)).toEqual({ ok: true, errors: [] });
  return {
    year: pillarToString(n.pillars.year),
    month: pillarToString(n.pillars.month),
    day: pillarToString(n.pillars.day),
    hour: pillarToString(n.pillars.hour),
    n,
  };
}

describe("기준 데이터 대조 (로컬 엔진)", () => {
  for (const rc of REFERENCE_CASES) {
    it(`${rc.id}: ${rc.description}`, async () => {
      const input = mkInput(rc.wall);
      for (const engine of [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[]) {
        const r = await run(engine, input);
        expect({ engine: engine.getEngineMetadata().id, ...rc.expected }).toEqual({
          engine: engine.getEngineMetadata().id,
          year: r.year,
          month: r.month,
          day: r.day,
          hour: r.hour,
        });
      }
    });
  }
});

describe("절기 경계 (2024 입춘 = 2024-02-04 17:27 KST)", () => {
  it("입춘 27분 전(17:00)은 계묘년 을축월, 3분 후(17:30)는 갑진년 병인월 — 두 엔진 모두", async () => {
    for (const engine of [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[]) {
      const before = await run(engine, mkInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 0 }));
      const after = await run(engine, mkInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 30 }));
      expect([before.year, before.month]).toEqual(["계묘", "을축"]);
      expect([after.year, after.month]).toEqual(["갑진", "병인"]);
    }
  });

  it("lunar-javascript 어댑터는 UTC+8 환산을 한다 (환산하지 않으면 16:30 KST에 이미 갑진으로 바뀌는 오류)", async () => {
    const r = await run(lunarJavascriptEngine as SajuEngine, mkInput({ year: 2024, month: 2, day: 4, hour: 17, minute: 20 }));
    expect(r.year).toBe("계묘");
    expect(r.n.applied.notes[0]).toMatch(/UTC\+8/);
  });
});

describe("자시와 날짜 경계 (2024-03-10 23:30)", () => {
  const w = { year: 2024, month: 3, day: 10, hour: 23, minute: 30 };

  it.each([
    ["midnight", "계유", "임자"],
    ["jasi", "갑술", "갑자"],
    ["splitJasi", "계유", "갑자"],
  ] as const)("manseryeok %s → 일주 %s, 시주 %s", async (b, day, hour) => {
    const r = await run(manseryeokEngine as SajuEngine, mkInput(w, { dayBoundary: b }));
    expect([r.day, r.hour]).toEqual([day, hour]);
  });

  it("lunar-javascript는 jasi·splitJasi를 지원하고 결과가 manseryeok과 같다", async () => {
    const j = await run(lunarJavascriptEngine as SajuEngine, mkInput(w, { dayBoundary: "jasi" }));
    const s = await run(lunarJavascriptEngine as SajuEngine, mkInput(w, { dayBoundary: "splitJasi" }));
    expect([j.day, j.hour]).toEqual(["갑술", "갑자"]);
    expect([s.day, s.hour]).toEqual(["계유", "갑자"]);
  });

  it("lunar-javascript는 midnight 관법의 23시대 시주를 비교 불가(SETTING_UNSUPPORTED)로 표시한다", async () => {
    const r = await run(lunarJavascriptEngine as SajuEngine, mkInput(w, { dayBoundary: "midnight" }));
    expect(r.day).toBe("계유");
    expect(r.hour).toBeNull();
    expect(r.n.comparability.hour).toMatchObject({ comparable: false, reason: "SETTING_UNSUPPORTED" });
  });

  it("자정 직후(00:10)는 모든 관법에서 다음 날 일주", async () => {
    for (const b of ["midnight", "jasi", "splitJasi"] as const) {
      const r = await run(manseryeokEngine as SajuEngine, mkInput({ year: 2024, month: 3, day: 11, hour: 0, minute: 10 }, { dayBoundary: b }));
      expect(r.day).toBe("갑술");
    }
  });
});

describe("시간 미상", () => {
  it("시주를 null로 두고 비교 대상에서 뺀다", async () => {
    for (const engine of [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[]) {
      const r = await run(engine, mkInput({ year: 2024, month: 1, day: 1, hour: 0, minute: 0 }, { timeKnown: false }));
      expect(r.hour).toBeNull();
      expect(r.n.comparability.hour.reason).toBe("TIME_UNKNOWN");
    }
  });
});

describe("대운", () => {
  it("1990-05-15 14:30 남성: 두 엔진의 순행 여부와 대운 간지 8개가 같다", async () => {
    const input = mkInput({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }, { gender: "male" });
    const a = await run(manseryeokEngine as SajuEngine, input);
    const b = await run(lunarJavascriptEngine as SajuEngine, input);
    expect(a.n.daewoon!.forward).toBe(true);
    expect(a.n.daewoon!.pillars).toEqual(["임오", "계미", "갑신", "을유", "병술", "정해", "무자", "기축"]);
    expect(b.n.daewoon!.pillars).toEqual(a.n.daewoon!.pillars);
    // 시작 시점은 엔진별 계산 방식이 달라 수일 차이가 난다 (교차검증에서 CONDITIONAL 처리)
    expect(a.n.daewoon!.start!.years).toBe(7);
    expect(b.n.daewoon!.start!.years).toBe(7);
  });

  it("성별이 없으면 대운을 계산하지 않는다", async () => {
    const r = await run(manseryeokEngine as SajuEngine, mkInput({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 }));
    expect(r.n.daewoon).toBeNull();
  });
});

describe("점봄 API 어댑터 (기록된 실제 응답으로 모의 테스트)", () => {
  it("응답을 공통 스키마로 정규화하고 해석 값(신강·용신)은 interpretive로 분리한다", async () => {
    const m = createJeombomMock();
    const r = await run(jeombomEngine as SajuEngine, mkInput({ year: 1992, month: 10, day: 24, hour: 5, minute: 30 }, { gender: "male" }), ctx(m.fetch));
    expect([r.year, r.month, r.day, r.hour]).toEqual(["임신", "경술", "계유", "을묘"]);
    expect(r.n.interpretive).toEqual({ strength: "중화", yongsin: "화" });
    expect(r.n.daewoon).toBeNull();
    expect(m.calls[0].get("tst")).toBe("0");
  });

  it("보정을 했다고 응답하면 SETTINGS_MISMATCH 오류", async () => {
    const m = createJeombomMock({ transform: (b) => ({ ...b, correction: { applied: true } }) });
    await expect(jeombomEngine.calculate(mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(m.fetch))).rejects.toMatchObject({
      code: "SETTINGS_MISMATCH",
    });
  });

  it("응답 형식이 깨지면 INVALID_RESPONSE", async () => {
    const m = createJeombomMock({ transform: (b) => ({ ...b, pillars: { year: "갑자" } }) });
    await expect(jeombomEngine.calculate(mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(m.fetch))).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("타임아웃 시 제한된 횟수만 재시도하고 TIMEOUT 오류", async () => {
    const m = createJeombomMock({ failOn: () => "timeout" });
    const err = await jeombomEngine
      .calculate(mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(m.fetch, 50, 2))
      .catch((e) => e);
    expect(err).toBeInstanceOf(EngineError);
    expect(err.code).toBe("TIMEOUT");
    expect(m.calls).toHaveLength(3);
    // 오류 메시지에 출생 정보(쿼리)가 들어가지 않는다
    expect(String(err.message)).not.toMatch(/2024|year=/);
  });

  it("5xx 후 성공하면 재시도로 회복한다", async () => {
    const m = createJeombomMock({ failOn: (i) => (i === 0 ? "500" : null) });
    const r = await run(jeombomEngine as SajuEngine, mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(m.fetch, 1000, 1));
    expect(r.day).toBe("갑자");
    expect(m.calls).toHaveLength(2);
  });

  it("429는 RATE_LIMITED, 4xx 입력 거부는 재시도하지 않는다", async () => {
    const m1 = createJeombomMock({ failOn: () => "429" });
    await expect(jeombomEngine.calculate(mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(m1.fetch, 1000, 1))).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    const m2 = createJeombomMock({ failOn: () => null, transform: () => ({ ok: false }) });
    const f422 = (async (...args: Parameters<typeof fetch>) => {
      await m2.fetch(...args);
      return new Response(JSON.stringify({ ok: false, error: { code: 422 } }), { status: 422 });
    }) as typeof fetch;
    await expect(jeombomEngine.calculate(mkInput({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }), ctx(f422, 1000, 2))).rejects.toMatchObject({
      code: "INPUT_REJECTED",
    });
    expect(m2.calls).toHaveLength(1);
  });

  it("midnight 외 관법의 23시대는 비교 불가로 표시한다", async () => {
    const m = createJeombomMock();
    const input = mkInput({ year: 2024, month: 3, day: 10, hour: 23, minute: 30 }, { dayBoundary: "jasi" });
    const r = await run(jeombomEngine as SajuEngine, input, ctx(m.fetch));
    expect(r.n.comparability.day.reason).toBe("SETTING_UNSUPPORTED");
    expect(r.n.comparability.hour.reason).toBe("SETTING_UNSUPPORTED");
  });
});
