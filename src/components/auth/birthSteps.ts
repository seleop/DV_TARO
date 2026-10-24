import type { JourneyStage } from "../cosmos/stages";

/**
 * 가입에 이어지는 출생 정보 단계 (2026-10-24 사용자 결정: 계정을 만든 뒤 같은 우주 배경에서 이어서).
 * 양력/음력 → 연 → 월 → 일 → (음력이면) 윤달 → 태어난 시각(모르면 건너뜀) → 성별(선택 안 함 가능).
 * 출생지·시간 보정·자시 처리는 기본값(서울·보정 없음·자정 기준)으로 저장하고 프로필에서 바꿀 수 있다.
 * 렌더링과 분리한 순수 계산 (tests/birth-steps.test.ts).
 */
export type BirthField = "calendar" | "year" | "month" | "day" | "leap" | "time" | "gender";

/** 모든 출생 정보 단계 (별자리 별 순서도 이대로: 양력이면 윤달 별은 지나가며 켜진다) */
export const BIRTH_FIELDS_ALL: BirthField[] = ["calendar", "year", "month", "day", "leap", "time", "gender"];

export type BirthValues = {
  calendar: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
  leap: boolean;
  timeKnown: boolean;
  hour: string;
  minute: string;
  gender: "" | "female" | "male";
};

export const BIRTH_DEFAULT: BirthValues = { calendar: "solar", year: 1995, month: 1, day: 1, leap: false, timeKnown: true, hour: "", minute: "", gender: "" };

/** 서버가 받는 연도 범위(src/lib/saju/input.ts)와 같게, 미래는 올해까지 */
export const BIRTH_MIN_YEAR = 1900;
export function birthMaxYear(now = new Date()) {
  return Math.min(2100, now.getFullYear());
}

/** 지금 달력에서 거칠 단계 */
export function birthSteps(calendar: BirthValues["calendar"]): BirthField[] {
  return calendar === "lunar" ? BIRTH_FIELDS_ALL : BIRTH_FIELDS_ALL.filter((f) => f !== "leap");
}

/** 그 달의 날 수: 양력은 실제 달력, 음력은 30일까지 (없는 날이면 서버가 알려 준다) */
export function daysIn(calendar: BirthValues["calendar"], year: number, month: number): number {
  return calendar === "lunar" ? 30 : new Date(year, month, 0).getDate();
}

const isInt = (s: string) => /^\d{1,2}$/.test(s.trim());

/** 이 단계에서 다음으로 넘어갈 수 없는 이유 (없으면 undefined) */
export function birthStepError(field: BirthField, v: BirthValues): string | undefined {
  if (field === "day" && v.day > daysIn(v.calendar, v.year, v.month)) return "그 달에는 없는 날이에요.";
  if (field === "time" && v.timeKnown) {
    if (!isInt(v.hour) || Number(v.hour) > 23) return "시는 0~23 사이로 입력해 주세요.";
    if (v.minute.trim() !== "" && (!isInt(v.minute) || Number(v.minute) > 59)) return "분은 0~59 사이로 입력해 주세요.";
  }
  return undefined;
}

/** 내 출생 정보 저장(PUT /api/me/birth) 본문. 고급 설정은 기본값 */
export function birthPayload(v: BirthValues) {
  return {
    calendar: v.calendar,
    year: v.year,
    month: v.month,
    day: v.day,
    isLeapMonth: v.calendar === "lunar" && v.leap,
    timeKnown: v.timeKnown,
    hour: v.timeKnown ? Number(v.hour) : null,
    minute: v.timeKnown ? Number(v.minute.trim() || "0") : null,
    gender: v.gender || null,
    birthplaceId: null,
    customLongitude: null,
    settings: { correction: "none", dayBoundary: "midnight", applyHistoricalOffset: true },
  };
}

/** 별자리에서 이 단계의 별 순서(출생 정보 부분 안에서) */
export function birthStarIndex(field: BirthField): number {
  return BIRTH_FIELDS_ALL.indexOf(field);
}

/**
 * 출생 정보 단계 → 우주 유람의 장. 계정을 만든 뒤 한숨 돌리고(기본 유람) 다시 차츰 역동적으로:
 * 양력/음력=기본 유람 → 연·월=별똥별이 밝아짐 → 일·윤달=성운 → 시각·성별=은하 중심부 → 완료=중심의 빛으로
 */
export function birthJourneyStage(field: BirthField, done: boolean): JourneyStage {
  if (done) return "arrive";
  switch (field) {
    case "calendar":
      return "cruise";
    case "year":
    case "month":
      return "ignite";
    case "day":
    case "leap":
      return "nebula";
    case "time":
    case "gender":
      return "core";
  }
}
