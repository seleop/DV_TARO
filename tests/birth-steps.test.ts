import { describe, expect, it } from "vitest";
import { BIRTH_DEFAULT, BIRTH_FIELDS_ALL, birthJourneyStage, birthPayload, birthStarIndex, birthStepError, birthSteps, daysIn, type BirthValues } from "@/components/auth/birthSteps";
import { authJourneyStage } from "@/components/auth/signupJourney";
import { CONSTELLATION_VIEW, constellationFor } from "@/components/auth/constellations";
import { parseBirthInput } from "@/lib/saju/input";

const v = (patch: Partial<BirthValues>): BirthValues => ({ ...BIRTH_DEFAULT, ...patch });

describe("가입에 이어지는 출생 정보 단계", () => {
  it("양력이면 윤달 단계를 건너뛰고, 음력이면 일 다음에 묻는다", () => {
    expect(birthSteps("solar")).toEqual(["calendar", "year", "month", "day", "time", "gender"]);
    expect(birthSteps("lunar")).toEqual(["calendar", "year", "month", "day", "leap", "time", "gender"]);
  });

  it("그 달의 날 수: 양력은 실제 달력(윤년 포함), 음력은 30일", () => {
    expect(daysIn("solar", 2024, 2)).toBe(29);
    expect(daysIn("solar", 2023, 2)).toBe(28);
    expect(daysIn("solar", 2023, 4)).toBe(30);
    expect(daysIn("lunar", 2023, 2)).toBe(30);
  });

  it("시각을 알면 시는 0~23, 분은 비우거나 0~59. 몰라요면 묻지 않는다", () => {
    expect(birthStepError("time", v({ hour: "" }))).toBeTruthy();
    expect(birthStepError("time", v({ hour: "24" }))).toBeTruthy();
    expect(birthStepError("time", v({ hour: "7", minute: "60" }))).toBeTruthy();
    expect(birthStepError("time", v({ hour: "7", minute: "" }))).toBeUndefined();
    expect(birthStepError("time", v({ hour: "23", minute: "59" }))).toBeUndefined();
    expect(birthStepError("time", v({ timeKnown: false, hour: "" }))).toBeUndefined();
    expect(birthStepError("day", v({ month: 2, day: 30 }))).toBeTruthy();
  });

  it("저장 본문은 서버 검증(parseBirthInput)을 통과한다 (양력·음력 윤달·시각 모름·성별 없음)", () => {
    for (const b of [
      v({ year: 1990, month: 5, day: 17, hour: "14", minute: "30", gender: "female" }),
      v({ calendar: "lunar", year: 1987, month: 6, day: 10, leap: true, timeKnown: false, gender: "" }),
      v({ year: 2001, month: 12, day: 31, hour: "0", minute: "" }),
    ]) {
      // 통과하지 못하면 예외를 던진다
      const parsed = parseBirthInput(birthPayload(b));
      expect(parsed.year).toBe(b.year);
      expect(parsed.timeKnown).toBe(b.timeKnown);
    }
    expect(birthPayload(v({ hour: "9", minute: "" })).minute).toBe(0);
    expect(birthPayload(v({ calendar: "solar", leap: true })).isLeapMonth).toBe(false);
  });

  it("단계마다 우주 유람의 장이 차츰 역동적으로 바뀌고, 완료하면 중심의 빛으로", () => {
    expect(birthJourneyStage("calendar", false)).toBe("cruise");
    expect(birthJourneyStage("year", false)).toBe("ignite");
    expect(birthJourneyStage("day", false)).toBe("nebula");
    expect(birthJourneyStage("gender", false)).toBe("core");
    expect(birthJourneyStage("gender", true)).toBe("arrive");
    expect(authJourneyStage("birth", "time", false)).toBe("core");
  });
});

describe("진행 표시 별자리 (실존 별자리)", () => {
  it("가입 5단계 + 출생 정보 7단계 = 12개, 초대 코드가 있으면 13개 모두 전갈자리", () => {
    expect(BIRTH_FIELDS_ALL).toHaveLength(7);
    expect(constellationFor(12).stars).toHaveLength(12);
    expect(constellationFor(13).stars).toHaveLength(13);
    expect(constellationFor(12).name).toBe("전갈자리");
  });

  it("별마다 이미 켜진 앞쪽 별 하나에서 이어지고, 모두 화면 안에 있다", () => {
    for (const n of [12, 13]) {
      const { stars } = constellationFor(n);
      expect(stars[0].from).toBeNull();
      stars.slice(1).forEach((s, i) => {
        expect(s.from).not.toBeNull();
        expect(s.from!).toBeLessThan(i + 1);
      });
      for (const s of stars) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(CONSTELLATION_VIEW);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(CONSTELLATION_VIEW);
      }
    }
  });

  it("하늘 지도처럼: 안타레스(α)는 머리(β)보다 아래(남쪽)·왼쪽(동쪽), 꼬리(θ)는 가장 아래쪽", () => {
    const { stars } = constellationFor(13);
    const by = (n: string) => stars.find((s) => s.name === n)!;
    expect(by("α").y).toBeGreaterThan(by("β").y);
    expect(by("α").x).toBeLessThan(by("β").x);
    expect(Math.max(...stars.map((s) => s.y))).toBeCloseTo(Math.max(by("θ").y, by("η").y), 5);
  });

  it("출생 정보 단계의 별 순서: 양력이어도 윤달 별 자리는 남아 지나가며 켜진다", () => {
    expect(birthStarIndex("day")).toBe(3);
    expect(birthStarIndex("time")).toBe(5);
  });
});
