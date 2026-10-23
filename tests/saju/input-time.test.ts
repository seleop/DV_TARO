import { describe, expect, it } from "vitest";
import { calculateFourPillars } from "manseryeok";
import { parseBirthInput } from "@/lib/saju/input";
import { equationOfTimeMinutes, normalizeBirthTime } from "@/lib/saju/time";

const base = { calendar: "solar", year: 1990, month: 5, day: 15, timeKnown: true, hour: 7, minute: 5 };

describe("출생 정보 입력 검증", () => {
  it("정상 양력 입력을 받는다", () => {
    const v = parseBirthInput(base);
    expect(v.settings).toEqual({ correction: "none", dayBoundary: "midnight", applyHistoricalOffset: true });
    expect(v.longitude).toBeNull();
  });

  it("존재하지 않는 양력 날짜(2023-02-29)를 거부한다", () => {
    expect(() => parseBirthInput({ ...base, year: 2023, month: 2, day: 29 })).toThrow(/존재하지 않는 양력/);
  });

  it("윤년 2월 29일(2024)은 받는다", () => {
    expect(parseBirthInput({ ...base, year: 2024, month: 2, day: 29 }).day).toBe(29);
  });

  it("양력에서 윤달 선택을 거부한다", () => {
    expect(() => parseBirthInput({ ...base, isLeapMonth: true })).toThrow(/윤달은 음력/);
  });

  it("음력 윤달 입력을 받는다 (실제 윤달 존재 여부는 변환 단계에서 확인)", () => {
    const v = parseBirthInput({ ...base, calendar: "lunar", year: 2020, month: 4, day: 1, isLeapMonth: true });
    expect(v.isLeapMonth).toBe(true);
  });

  it("음력 31일을 거부한다", () => {
    expect(() => parseBirthInput({ ...base, calendar: "lunar", day: 31 })).toThrow(/30일/);
  });

  it("지원 범위(1900~2100) 밖 연도를 거부한다", () => {
    expect(() => parseBirthInput({ ...base, year: 1899 })).toThrow();
    expect(() => parseBirthInput({ ...base, year: 2101 })).toThrow();
  });

  it("시간 미상이면 시각이 없어야 하고, 시주 계산용 시각을 저장하지 않는다", () => {
    const v = parseBirthInput({ calendar: "solar", year: 1990, month: 5, day: 15, timeKnown: false });
    expect(v.hour).toBeNull();
    expect(v.minute).toBeNull();
    expect(() => parseBirthInput({ ...base, timeKnown: false })).toThrow(/시간 미상/);
  });

  it("시간을 안다고 했는데 시각이 없으면 거부한다", () => {
    expect(() => parseBirthInput({ calendar: "solar", year: 1990, month: 5, day: 15, timeKnown: true })).toThrow(/출생 시/);
  });

  it("시간 보정은 출생지가 필요하고, 시간 미상과 함께 쓸 수 없다", () => {
    expect(() => parseBirthInput({ ...base, settings: { correction: "tst" } })).toThrow(/출생지/);
    expect(() =>
      parseBirthInput({ calendar: "solar", year: 1990, month: 5, day: 15, timeKnown: false, birthplaceId: "seoul", settings: { correction: "lmt" } }),
    ).toThrow(/출생 시각을 알 때만/);
    const v = parseBirthInput({ ...base, birthplaceId: "busan", settings: { correction: "lmt" } });
    expect(v.longitude).toBe(129.08);
  });

  it("알 수 없는 필드를 거부한다 (strict)", () => {
    expect(() => parseBirthInput({ ...base, name: "홍길동" })).toThrow();
  });
});

describe("시각 정규화", () => {
  const noCorr = { correction: "none" as const, dayBoundary: "midnight" as const, applyHistoricalOffset: true };

  it("보정 없음 + 현대(UTC+9) 시각은 그대로 둔다", () => {
    const t = normalizeBirthTime({ year: 1990, month: 5, day: 15, hour: 7, minute: 5 }, noCorr, null);
    expect(t.termTime).toEqual({ year: 1990, month: 5, day: 15, hour: 7, minute: 5 });
    expect(t.pillarTime).toEqual(t.termTime);
    expect(t.historicalAdjusted).toBe(false);
  });

  it("1958년 서머타임(UTC+9:30) 기록 시각을 UTC+9로 30분 당긴다", () => {
    // IANA tz: 1954-03-21 ~ 1961-08-10 표준시 UTC+8:30, 1958-05-04 ~ 09-21 서머타임(+1h)
    const t = normalizeBirthTime({ year: 1958, month: 6, day: 1, hour: 0, minute: 30 }, noCorr, null);
    expect(t.recordedUtcOffsetMinutes).toBe(570);
    expect(t.termTime).toEqual({ year: 1958, month: 6, day: 1, hour: 0, minute: 0 });
  });

  it("1958년 겨울(UTC+8:30) 기록 시각을 UTC+9로 30분 늦춘다", () => {
    const t = normalizeBirthTime({ year: 1958, month: 1, day: 1, hour: 23, minute: 40 }, noCorr, null);
    expect(t.recordedUtcOffsetMinutes).toBe(510);
    expect(t.termTime).toEqual({ year: 1958, month: 1, day: 2, hour: 0, minute: 10 });
  });

  it("1988년 서머타임(UTC+10) 시각을 1시간 당긴다", () => {
    const t = normalizeBirthTime({ year: 1988, month: 7, day: 1, hour: 1, minute: 0 }, noCorr, null);
    expect(t.recordedUtcOffsetMinutes).toBe(600);
    expect(t.termTime).toEqual({ year: 1988, month: 7, day: 1, hour: 0, minute: 0 });
  });

  it("과거 표준시 환산을 끄면 기록 시각을 UTC+9로 그대로 본다", () => {
    const t = normalizeBirthTime({ year: 1988, month: 7, day: 1, hour: 1, minute: 0 }, { ...noCorr, applyHistoricalOffset: false }, null);
    expect(t.termTime.hour).toBe(1);
  });

  it("지방평균시(LMT) 보정: 서울 경도 126.98 → 약 -32분", () => {
    const t = normalizeBirthTime({ year: 1990, month: 5, day: 15, hour: 7, minute: 5 }, { ...noCorr, correction: "lmt" }, 126.98);
    expect(t.correctionMinutes).toBeCloseTo(-32.1, 1);
    expect(t.pillarTime).toEqual({ year: 1990, month: 5, day: 15, hour: 6, minute: 33 });
    // 연·월주용 시각은 보정하지 않는다 (절입은 절대 순간)
    expect(t.termTime.hour).toBe(7);
  });

  it("균시차는 연중 ±17분 범위이고 11월 초 최대(+16분 내외), 2월 중순 최소(-14분 내외)", () => {
    const nov = equationOfTimeMinutes(Date.UTC(2024, 10, 3, 3));
    const feb = equationOfTimeMinutes(Date.UTC(2024, 1, 11, 3));
    expect(nov).toBeGreaterThan(15);
    expect(nov).toBeLessThan(17.5);
    expect(feb).toBeLessThan(-13.5);
    expect(feb).toBeGreaterThan(-15);
  });

  it("진태양시 보정 결과의 시주가 manseryeok 자체 진태양시 구현과 일치한다 (독립 구현 대조)", () => {
    // 우리 구현(Intl tz + NOAA 균시차)과 manseryeok(내장 표 + 자체 균시차)은 서로 독립이다.
    const cases = [
      { year: 1990, month: 5, day: 15, hour: 7, minute: 5 },
      { year: 1958, month: 6, day: 1, hour: 0, minute: 30 },
      { year: 1988, month: 8, day: 20, hour: 13, minute: 10 },
      { year: 2001, month: 11, day: 3, hour: 9, minute: 20 },
      { year: 1975, month: 2, day: 12, hour: 23, minute: 50 },
    ];
    for (const c of cases) {
      const t = normalizeBirthTime(c, { ...noCorr, correction: "tst" }, 126.98);
      const ours = calculateFourPillars({ ...t.pillarTime }).toObject();
      const theirs = calculateFourPillars({
        ...c,
        trueSolarTime: { longitude: 126.98, applyEquationOfTime: true, applyHistoricalDst: true },
      }).toObject();
      expect({ c, day: ours.day, hour: ours.hour }).toEqual({ c, day: theirs.day, hour: theirs.hour });
    }
  });
});
