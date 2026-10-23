import { beforeEach, describe, expect, it } from "vitest";
import { parseBirthInput } from "@/lib/saju/input";
import { jeombomEngine } from "@/lib/saju/engines/jeombom";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { calculateSaju, computeCacheKey, SajuInputError, verifiedDateGanji } from "@/lib/saju/service";
import { createJeombomMock } from "../helpers/jeombom-mock";

const ALL = [manseryeokEngine, lunarJavascriptEngine, jeombomEngine] as SajuEngine[];
const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];
let n = 0;
const uid = () => `user-${++n}-${Math.random()}`;

const solar = (y: number, m: number, d: number, h: number | null, mi: number | null, extra: Record<string, unknown> = {}) =>
  parseBirthInput({ calendar: "solar", year: y, month: m, day: d, timeKnown: h !== null, hour: h, minute: mi, ...extra });

describe("사주 계산 서비스 (모의 외부 API)", () => {
  beforeEach(() => {
    n += 1;
  });

  it("세 엔진 완전 일치 → MATCH, 확정 원국과 출처 표기", async () => {
    const m = createJeombomMock();
    const c = await calculateSaju(uid(), solar(1992, 10, 24, 5, 30, { gender: "male" }), {
      engines: ALL,
      jeombomEnabled: true,
      ctx: { fetchImpl: m.fetch, maxRetries: 0 },
    });
    // 대운: 점봄은 제공하지 않고 두 로컬 엔진은 시작 시점 계산 방식이 달라 CONDITIONAL일 수 있다.
    expect(["MATCH", "CONDITIONAL_MATCH"]).toContain(c.status);
    expect(c.report.fields.year.compared).toEqual(["manseryeok", "lunar-javascript", "jeombom"]);
    expect(c.canonical.pillars.day).toEqual({ ganji: "계유", hanja: "癸酉" });
    expect(c.canonical.dayMaster).toEqual({ stem: "계", element: "수" });
    expect(c.canonical.elements).toEqual({ 목: 2, 화: 0, 토: 1, 금: 3, 수: 2 });
    expect(c.canonical.unresolvedFields).toEqual([]);
    expect(c.attributions[0]).toMatch(/점봄/);
    expect(c.canonical.interpretiveReference[0]).toMatchObject({ engine: "jeombom", strength: "중화" });
  });

  it("성별 없이 계산하면 대운 없이 MATCH", async () => {
    const m = createJeombomMock();
    const c = await calculateSaju(uid(), solar(2024, 1, 1, 12, 0), { engines: ALL, jeombomEnabled: true, ctx: { fetchImpl: m.fetch, maxRetries: 0 } });
    expect(c.status).toBe("MATCH");
    expect(c.canonical.daewoon).toBeNull();
    expect(c.report.daewoon.status).toBe("NOT_APPLICABLE");
  });

  it("외부 API가 다른 값을 주면 MISMATCH, 해당 기둥은 미확정으로 남고 재계산 기록을 남긴다", async () => {
    const m = createJeombomMock({ transform: (b) => ({ ...b, pillars: { ...(b.pillars as object), month: ["을", "축"] } }) });
    const c = await calculateSaju(uid(), solar(2024, 1, 1, 12, 0), { engines: ALL, jeombomEnabled: true, ctx: { fetchImpl: m.fetch, maxRetries: 0 } });
    expect(c.status).toBe("MISMATCH");
    expect(c.canonical.pillars.month).toBeNull();
    expect(c.canonical.unresolvedFields).toEqual(["month"]);
    expect(c.canonical.pillars.day?.ganji).toBe("갑자");
    expect(c.resolutionLog.join("\n")).toMatch(/동일 조건 재계산\(jeombom\)/);
    expect(m.calls.length).toBe(2); // 최초 1회 + 원격 엔진 재계산 1회
  });

  it("외부 API 타임아웃 → 해당 엔진 실패로 기록하고 남은 두 엔진으로 판정", async () => {
    const m = createJeombomMock({ failOn: () => "timeout" });
    const c = await calculateSaju(uid(), solar(2024, 1, 1, 12, 0), {
      engines: ALL,
      jeombomEnabled: true,
      ctx: { fetchImpl: m.fetch, timeoutMs: 30, maxRetries: 1 },
    });
    expect(c.status).toBe("MATCH");
    expect(c.report.engines.find((e) => e.engine === "jeombom")).toMatchObject({ ok: false, errorCode: "TIMEOUT" });
  });

  it("엔진이 하나만 남으면 UNVERIFIABLE이고 기둥을 확정하지 않는다", async () => {
    const m = createJeombomMock({ failOn: () => "network" });
    const c = await calculateSaju(uid(), solar(2024, 1, 1, 12, 0), {
      engines: [manseryeokEngine, jeombomEngine] as SajuEngine[],
      jeombomEnabled: true,
      ctx: { fetchImpl: m.fetch, maxRetries: 0 },
    });
    expect(c.status).toBe("UNVERIFIABLE");
    expect(c.canonical.pillars.year).toBeNull();
    expect(c.canonical.unresolvedFields).toEqual(["year", "month", "day", "hour"]);
  });

  it("midnight 관법 23시대 → lunar-javascript 시주 제외, 나머지 두 엔진 일치 → MATCH", async () => {
    const m = createJeombomMock();
    const c = await calculateSaju(uid(), solar(2024, 3, 10, 23, 30), { engines: ALL, jeombomEnabled: true, ctx: { fetchImpl: m.fetch, maxRetries: 0 } });
    expect(c.status).toBe("MATCH");
    expect(c.report.fields.hour.compared).toEqual(["manseryeok", "jeombom"]);
    expect(c.canonical.pillars.hour?.ganji).toBe("임자");
  });

  it("jasi 관법 23시대 → 점봄 제외, 두 로컬 엔진 일치 → MATCH (2개 이상 비교)", async () => {
    const m = createJeombomMock();
    const c = await calculateSaju(uid(), solar(2024, 3, 10, 23, 30, { settings: { dayBoundary: "jasi" } }), {
      engines: ALL,
      jeombomEnabled: true,
      ctx: { fetchImpl: m.fetch, maxRetries: 0 },
    });
    expect(c.status).toBe("MATCH");
    expect(c.canonical.pillars.day?.ganji).toBe("갑술");
    expect(c.report.fields.day.excluded).toEqual([{ engine: "jeombom", reason: "SETTING_UNSUPPORTED" }]);
  });

  it("midnight 관법 23시대 + 로컬 두 엔진만 → 시주는 한 엔진만 비교 가능 → CONDITIONAL_MATCH", async () => {
    const c = await calculateSaju(uid(), solar(2024, 3, 10, 23, 30), { engines: LOCAL, jeombomEnabled: false });
    expect(c.status).toBe("CONDITIONAL_MATCH");
    expect(c.report.reasons).toEqual(["SETTING_DIFFERENCE"]);
  });

  it("시간 미상(평일) → 시주 없이 MATCH", async () => {
    const c = await calculateSaju(uid(), solar(2024, 1, 15, null, null), { engines: LOCAL, jeombomEnabled: false });
    expect(c.status).toBe("MATCH");
    expect(c.canonical.pillars.hour).toBeNull();
    expect(c.report.fields.hour.status).toBe("NOT_APPLICABLE");
  });

  it("시간 미상 + 입춘 당일(2024-02-04) → 연·월주가 하루 안에서 바뀌므로 UNVERIFIABLE", async () => {
    const c = await calculateSaju(uid(), solar(2024, 2, 4, null, null), { engines: LOCAL, jeombomEnabled: false });
    expect(c.status).toBe("UNVERIFIABLE");
    expect(c.report.reasons).toContain("BIRTH_TIME_REQUIRED_FOR_BOUNDARY");
    expect(c.canonical.pillars.year).toBeNull();
    expect(c.canonical.pillars.day?.ganji).toBe("무술");
  });

  it("음력 윤달(2020 윤4월 1일) → 양력 2020-05-23으로 변환·검증", async () => {
    const c = await calculateSaju(uid(), parseBirthInput({ calendar: "lunar", year: 2020, month: 4, day: 1, isLeapMonth: true, timeKnown: true, hour: 12, minute: 0 }), {
      engines: LOCAL,
      jeombomEnabled: false,
    });
    expect(c.lunar?.status).toBe("VERIFIED");
    expect(c.solarDate).toEqual({ year: 2020, month: 5, day: 23 });
    // KASI: 2020 윤4월 1일 = 양력 2020-05-23 (두 로컬 엔진 일치) → 일주 병인
    expect(c.canonical.pillars.day?.ganji).toBe("병인");
  });

  it("[외부 API 결함 기록] 점봄 API는 윤달 입력을 평달로 계산한다 (2026-10-23 실측)", async () => {
    const { loadFixture } = await import("../helpers/jeombom-mock");
    const fx = loadFixture("l20200401_leap") as { input: { leapMonth: boolean }; pillars: { day: string[] } };
    expect(fx.input.leapMonth).toBe(true);
    // 병신 = 양력 2020-04-23(평달 4월 1일)의 일주. 윤4월 1일(2020-05-23)은 병인이어야 한다.
    expect(fx.pillars.day.join("")).toBe("병신");
  });

  it("두 로컬 엔진이 일치하는 윤달은 점봄을 호출하지 않는다", async () => {
    const { verifyLunarConversion } = await import("@/lib/saju/lunar");
    const m = createJeombomMock();
    // 한·중 윤달이 서로 다른 실제 날짜는 아직 확보하지 못해 그 분기(점봄 미사용 → UNVERIFIED)는 단위 테스트가 없다.
    const r = await verifyLunarConversion({ year: 2020, month: 4, day: 1, isLeapMonth: true }, { jeombomEnabled: true, ctx: { fetchImpl: m.fetch, timeoutMs: 100, maxRetries: 0 } });
    expect(r.status).toBe("VERIFIED");
    expect(m.calls).toHaveLength(0);
  });

  it("존재하지 않는 윤달(2021 윤4월)은 입력 오류", async () => {
    await expect(
      calculateSaju(uid(), parseBirthInput({ calendar: "lunar", year: 2021, month: 4, day: 1, isLeapMonth: true, timeKnown: false }), {
        engines: LOCAL,
        jeombomEnabled: false,
      }),
    ).rejects.toBeInstanceOf(SajuInputError);
  });

  it("한·중 음력이 다른 날(음력 1997-01-01) → 점봄으로 KASI 날짜(1997-02-08) 확인 → CONDITIONAL_MATCH", async () => {
    const m = createJeombomMock();
    const input = parseBirthInput({ calendar: "lunar", year: 1997, month: 1, day: 1, timeKnown: false });
    const c = await calculateSaju(uid(), input, { engines: LOCAL, jeombomEnabled: true, ctx: { fetchImpl: m.fetch, maxRetries: 0 } });
    expect(c.lunar).toMatchObject({ status: "VERIFIED_BY_INDEPENDENT_SOURCE", candidates: { kasi: "1997-02-08", chinese: "1997-02-07" } });
    expect(c.solarDate).toEqual({ year: 1997, month: 2, day: 8 });
    expect(c.status).toBe("CONDITIONAL_MATCH");
  });

  it("같은 날을 외부 검증 없이 계산하면 음력 변환 미확정 → UNVERIFIABLE", async () => {
    const input = parseBirthInput({ calendar: "lunar", year: 1997, month: 1, day: 1, timeKnown: false });
    const c = await calculateSaju(uid(), input, { engines: LOCAL, jeombomEnabled: false });
    expect(c.lunar?.status).toBe("UNVERIFIED");
    expect(c.status).toBe("UNVERIFIABLE");
  });

  it("진태양시 보정 설정이 다르면 결과와 캐시 키가 달라진다", async () => {
    const u = uid();
    // 1990-05-15 07:05 → 보정 없음: 진시 / 서울 진태양시(약 06:37): 묘시
    const plain = solar(1990, 5, 15, 7, 5);
    const tst = solar(1990, 5, 15, 7, 5, { birthplaceId: "seoul", settings: { correction: "tst" } });
    const a = await calculateSaju(u, plain, { engines: LOCAL, jeombomEnabled: false });
    const b = await calculateSaju(u, tst, { engines: LOCAL, jeombomEnabled: false });
    expect(a.canonical.pillars.hour?.ganji.endsWith("진")).toBe(true);
    expect(b.canonical.pillars.hour?.ganji.endsWith("묘")).toBe(true);
    expect(a.cacheKey).not.toBe(b.cacheKey);
    expect(b.time?.correctionMinutes).toBeLessThan(-25);
  });

  it("엔진 버전이 바뀌면 캐시 키가 달라진다", () => {
    const input = solar(1990, 5, 15, 7, 5);
    const metas = LOCAL.map((e) => e.getEngineMetadata());
    const k1 = computeCacheKey("u", input, metas);
    const k2 = computeCacheKey("u", input, [{ ...metas[0], version: "9.9.9" }, metas[1]]);
    const k3 = computeCacheKey("other", input, metas);
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });

  it("오늘의 간지는 두 로컬 엔진이 일치할 때만 반환", async () => {
    const g = await verifiedDateGanji(new Date(Date.UTC(2024, 0, 1, 3)));
    expect(g).toEqual({ date: "2024-01-01", year: "계묘", month: "갑자", day: "갑자" });
  });
});
