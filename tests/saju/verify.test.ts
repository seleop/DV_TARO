import { describe, expect, it } from "vitest";
import { parsePillar } from "@/lib/saju/ganji";
import type { Comparability, NormalizedSaju } from "@/lib/saju/types";
import { crossValidate, type EngineOutcome } from "@/lib/saju/verify";

const ok: Comparability = { comparable: true };

function result(engine: string, p: { year: string; month: string; day: string; hour: string | null }, over: Partial<NormalizedSaju> = {}): NormalizedSaju {
  return {
    engine,
    engineVersion: "1",
    pillars: { year: parsePillar(p.year), month: parsePillar(p.month), day: parsePillar(p.day), hour: p.hour ? parsePillar(p.hour) : null },
    comparability: { year: ok, month: ok, day: ok, hour: p.hour ? ok : { comparable: false, reason: "TIME_UNKNOWN" }, daewoon: { comparable: false, reason: "NOT_PROVIDED" }, tenGods: { comparable: false, reason: "NOT_PROVIDED" }, elements: { comparable: false, reason: "NOT_PROVIDED" } },
    daewoon: null,
    stemTenGods: null,
    elements: null,
    interpretive: null,
    applied: { dayBoundary: "midnight", timeBasis: "test", notes: [] },
    ...over,
  };
}

const P = { year: "계묘", month: "갑자", day: "갑자", hour: "경오" };
const outcome = (r: NormalizedSaju): EngineOutcome => ({ engine: r.engine, engineVersion: "1", ok: true, result: r, validationErrors: [], durationMs: 1 });
const fail = (engine: string, code = "TIMEOUT"): EngineOutcome => ({ engine, engineVersion: "1", ok: false, errorCode: code, durationMs: 1 });
const opts = { timeKnown: true, hasGender: false, lunarStatus: null };

describe("교차검증 판정", () => {
  it("MATCH: 세 엔진의 네 기둥이 모두 같음", () => {
    const r = crossValidate([outcome(result("a", P)), outcome(result("b", P)), outcome(result("c", P))], opts);
    expect(r.status).toBe("MATCH");
    expect(r.fields.day).toMatchObject({ status: "MATCH", agreedValue: "갑자", compared: ["a", "b", "c"] });
    expect(r.reasons).toEqual([]);
  });

  it("MISMATCH: 2대1이어도 다수결로 확정하지 않는다", () => {
    const r = crossValidate([outcome(result("a", P)), outcome(result("b", P)), outcome(result("c", { ...P, month: "을축" }))], opts);
    expect(r.status).toBe("MISMATCH");
    expect(r.reasons).toContain("CORE_MISMATCH");
    expect(r.fields.month.status).toBe("MISMATCH");
    expect(r.fields.month.agreedValue).toBeNull();
    expect(r.fields.month.values).toEqual({ a: "갑자", b: "갑자", c: "을축" });
    // 일치한 다른 필드는 유지
    expect(r.fields.day.status).toBe("MATCH");
  });

  it("CONDITIONAL_MATCH: 한 엔진이 설정을 지원하지 않아 빠졌고 나머지 핵심 항목은 일치", () => {
    const b = result("b", { ...P, hour: null });
    b.comparability.hour = { comparable: false, reason: "SETTING_UNSUPPORTED" };
    const r = crossValidate([outcome(result("a", P)), outcome(b)], opts);
    expect(r.status).toBe("CONDITIONAL_MATCH");
    expect(r.reasons).toEqual(["SETTING_DIFFERENCE"]);
    expect(r.fields.hour).toMatchObject({ status: "CONDITIONAL", agreedValue: "경오", compared: ["a"] });
  });

  it("UNVERIFIABLE: 엔진 하나만 성공", () => {
    const r = crossValidate([outcome(result("a", P)), fail("b"), fail("c", "INVALID_RESPONSE")], opts);
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.reasons).toEqual(["INSUFFICIENT_ENGINES"]);
    expect(r.engines.map((e) => e.errorCode)).toEqual([undefined, "TIMEOUT", "INVALID_RESPONSE"]);
  });

  it("UNVERIFIABLE: 검증 실패(필수 필드 누락) 엔진은 사용하지 않는다", () => {
    const bad: EngineOutcome = { ...outcome(result("b", P)), validationErrors: ["day 기둥 누락"] };
    const r = crossValidate([outcome(result("a", P)), bad], opts);
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.engines[1]).toMatchObject({ ok: false, errorCode: "VALIDATION_FAILED" });
  });

  it("UNVERIFIABLE: 비교 가능한 엔진이 하나뿐인데 사유가 설정 차이가 아니라 누락", () => {
    const b = result("b", { ...P, hour: null });
    b.comparability.hour = { comparable: false, reason: "NOT_PROVIDED" };
    const r = crossValidate([outcome(result("a", P)), outcome(b)], opts);
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.fields.hour.status).toBe("UNVERIFIED");
  });

  it("시간 미상이면 시주는 NOT_APPLICABLE이고 나머지가 일치하면 MATCH", () => {
    const p = { ...P, hour: null };
    const r = crossValidate([outcome(result("a", p)), outcome(result("b", p))], { ...opts, timeKnown: false });
    expect(r.status).toBe("MATCH");
    expect(r.fields.hour.status).toBe("NOT_APPLICABLE");
  });

  it("시간 미상 + 하루 안에 절입이 있어 월주가 모호하면 UNVERIFIABLE", () => {
    const p = { ...P, hour: null };
    const r = crossValidate([outcome(result("a", p)), outcome(result("b", p))], { ...opts, timeKnown: false, ambiguousFields: ["year", "month"] });
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.reasons).toContain("BIRTH_TIME_REQUIRED_FOR_BOUNDARY");
    expect(r.fields.month.agreedValue).toBeNull();
  });

  it("음력 변환 미확정이면 기둥이 일치해도 UNVERIFIABLE", () => {
    const r = crossValidate([outcome(result("a", P)), outcome(result("b", P))], { ...opts, lunarStatus: "UNVERIFIED" });
    expect(r.status).toBe("UNVERIFIABLE");
    expect(r.reasons).toContain("LUNAR_CONVERSION_UNVERIFIED");
  });

  it("한·중 음력 차이를 독립 출처로 확정했다면 CONDITIONAL_MATCH", () => {
    const r = crossValidate([outcome(result("a", P)), outcome(result("b", P))], { ...opts, lunarStatus: "VERIFIED_BY_INDEPENDENT_SOURCE" });
    expect(r.status).toBe("CONDITIONAL_MATCH");
    expect(r.reasons).toEqual(["LUNAR_CALENDAR_SYSTEM_DIFFERENCE"]);
  });

  it("해석 값(신강·용신) 차이는 판정에 영향을 주지 않는다", () => {
    const a = result("a", P, { interpretive: { strength: "신강", yongsin: "토" } });
    const b = result("b", P, { interpretive: { strength: "신약", yongsin: "수" } });
    const r = crossValidate([outcome(a), outcome(b)], opts);
    expect(r.status).toBe("MATCH");
    expect(r.interpretiveDifferences).toHaveLength(2);
  });

  describe("대운", () => {
    const pillars = ["임오", "계미", "갑신", "을유", "병술", "정해", "무자", "기축"];
    const withDw = (e: string, start: { years: number; months: number; days: number }, over: Partial<{ forward: boolean; pillars: string[] }> = {}) => {
      const r = result(e, P, { daewoon: { forward: true, start, pillars, ...over } });
      r.comparability.daewoon = ok;
      return outcome(r);
    };
    const o = { ...opts, hasGender: true };

    it("시작 시점까지 같으면 MATCH", () => {
      const r = crossValidate([withDw("a", { years: 7, months: 2, days: 0 }), withDw("b", { years: 7, months: 2, days: 0 })], o);
      expect(r.daewoon.status).toBe("MATCH");
      expect(r.status).toBe("MATCH");
    });

    it("시작 시점이 허용 범위(12개월) 안에서 다르면 CONDITIONAL_MATCH", () => {
      const r = crossValidate([withDw("a", { years: 7, months: 2, days: 26 }), withDw("b", { years: 7, months: 1, days: 20 })], o);
      expect(r.daewoon.status).toBe("CONDITIONAL");
      expect(r.status).toBe("CONDITIONAL_MATCH");
      expect(r.reasons).toEqual(["DAEWOON_START_CONVENTION"]);
    });

    it("대운 간지나 순행·역행이 다르면 MISMATCH", () => {
      const r1 = crossValidate([withDw("a", { years: 7, months: 0, days: 0 }), withDw("b", { years: 7, months: 0, days: 0 }, { forward: false })], o);
      expect(r1.status).toBe("MISMATCH");
      expect(r1.reasons).toEqual(["DAEWOON_MISMATCH"]);
      const r2 = crossValidate([withDw("a", { years: 7, months: 0, days: 0 }), withDw("b", { years: 7, months: 0, days: 0 }, { pillars: [...pillars].reverse() })], o);
      expect(r2.status).toBe("MISMATCH");
    });

    it("시작 시점 차이가 허용 범위를 넘으면 MISMATCH", () => {
      const r = crossValidate([withDw("a", { years: 7, months: 0, days: 0 }), withDw("b", { years: 9, months: 0, days: 0 })], o);
      expect(r.status).toBe("MISMATCH");
    });

    it("대운 제공 엔진이 하나뿐이면 대운만 UNVERIFIED (원국 판정은 유지)", () => {
      const r = crossValidate([withDw("a", { years: 7, months: 0, days: 0 }), outcome(result("b", P))], o);
      expect(r.daewoon.status).toBe("UNVERIFIED");
      expect(r.status).toBe("MATCH");
    });
  });

  it("원국이 같은데 천간 십신이 다르면 계산 오류로 MISMATCH", () => {
    const tg = (e: string, month: "비견" | "겁재") => {
      const r = result(e, P, { stemTenGods: { year: "정인", month, hour: "편관" } });
      r.comparability.tenGods = ok;
      return outcome(r);
    };
    expect(crossValidate([tg("a", "비견"), tg("b", "비견")], opts).tenGods.status).toBe("MATCH");
    const r = crossValidate([tg("a", "비견"), tg("b", "겁재")], opts);
    expect(r.status).toBe("MISMATCH");
    expect(r.reasons).toEqual(["TEN_GOD_MISMATCH"]);
  });
});
