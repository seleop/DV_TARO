import type { Element, Pillar, TenGod } from "./ganji";

export type DayBoundary = "midnight" | "jasi" | "splitJasi";
export type CorrectionMode = "none" | "lmt" | "tst";
export type Gender = "male" | "female";

/** 사용자가 입력한 출생 정보 (검증 완료 후). */
export interface BirthInput {
  calendar: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  timeKnown: boolean;
  hour: number | null;
  minute: number | null;
  gender: Gender | null;
  /** 현재는 Asia/Seoul만 지원한다. */
  timeZone: "Asia/Seoul";
  /** 출생지 경도(동경). correction이 none이면 쓰지 않는다. */
  longitude: number | null;
  birthplaceLabel: string | null;
  settings: CalcSettings;
}

export interface CalcSettings {
  correction: CorrectionMode;
  dayBoundary: DayBoundary;
  /** 과거 표준시(UTC+8:30)·서머타임을 IANA tz로 UTC+9 기준으로 환산할지 */
  applyHistoricalOffset: boolean;
}

/** 벽시계 시각 (타임존 정보 없이 값만). */
export interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 모든 엔진에 동일하게 전달되는 정규화 입력.
 * - termTime: UTC+9 표준시 기준 벽시계. 연주·월주(절입 경계)와 대운 판정용.
 * - pillarTime: 일주·시주 판정용. 보정이 없으면 termTime과 같다.
 */
export interface EngineInput {
  solarDate: { year: number; month: number; day: number };
  termTime: WallTime;
  pillarTime: WallTime;
  timeKnown: boolean;
  dayBoundary: DayBoundary;
  gender: Gender | null;
  /** 원래 음력 입력 (엔진이 독립적으로 음력 변환을 검증할 때만 사용) */
  lunarSource: { year: number; month: number; day: number; isLeapMonth: boolean } | null;
}

export type CoreField = "year" | "month" | "day" | "hour";
export const CORE_FIELDS: CoreField[] = ["year", "month", "day", "hour"];

export interface Daewoon {
  forward: boolean;
  /** 대운 시작 시점 (년·월·일 정밀값). 엔진이 제공하지 않으면 null */
  start: { years: number; months: number; days: number } | null;
  /** 첫 대운부터 순서대로 간지 (최소 8개) */
  pillars: string[];
}

export interface Comparability {
  comparable: boolean;
  /** comparable=false 일 때 사유 코드 */
  reason?: "SETTING_UNSUPPORTED" | "NOT_PROVIDED" | "TIME_UNKNOWN";
  note?: string;
}

/** 엔진 결과의 공통 스키마 */
export interface NormalizedSaju {
  engine: string;
  engineVersion: string;
  pillars: Record<CoreField, Pillar | null>;
  comparability: Record<CoreField | "daewoon" | "tenGods" | "elements", Comparability>;
  daewoon: Daewoon | null;
  /** 천간 십신 (일간 제외). 지지 십신은 기준(본기/지장간)이 엔진마다 달라 비교하지 않는다. */
  stemTenGods: { year: TenGod; month: TenGod; hour: TenGod | null } | null;
  elements: Record<Element, number> | null;
  /** 해석 체계에 따라 달라지는 값. 계산 오류 판정에 쓰지 않는다. */
  interpretive: { strength?: string; yongsin?: string } | null;
  /** 엔진이 실제로 적용한 기준 */
  applied: { dayBoundary: DayBoundary | "unknown"; timeBasis: string; notes: string[] };
}

export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  kind: "local-library" | "remote-api";
  license: string;
  basis: string;
  attribution?: string;
  supportedDayBoundaries: DayBoundary[];
  providesDaewoon: boolean;
}

export type VerificationStatus = "MATCH" | "CONDITIONAL_MATCH" | "MISMATCH" | "UNVERIFIABLE";
