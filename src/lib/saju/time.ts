import type { CalcSettings, WallTime } from "./types";

/**
 * 출생 시각 정규화.
 *
 * 1) 기록된 현지 벽시계 시각 → 절대 순간(UTC). 과거 표준시(UTC+8:30)와 서머타임은
 *    런타임의 IANA tz 데이터(Intl)로 판정한다. 엔진 라이브러리 내부 표와는 독립적이다.
 * 2) termTime: 절대 순간을 UTC+9 표준시 벽시계로 표현. 연주·월주(절입)와 대운 판정에 쓴다.
 * 3) pillarTime: 일주·시주 판정용.
 *    - none: termTime 그대로
 *    - lmt : 지방평균시 = UTC + 경도×4분
 *    - tst : 진태양시 = 지방평균시 + 균시차(NOAA 근사식)
 */

const MIN = 60_000;
const KST_OFFSET_MIN = 540;

export interface TimeNormalization {
  termTime: WallTime;
  pillarTime: WallTime;
  /** 기록 시각에 적용된 실제 UTC 오프셋(분) */
  recordedUtcOffsetMinutes: number;
  /** 과거 표준시·서머타임 때문에 UTC+9 기준과 달라졌는지 */
  historicalAdjusted: boolean;
  /** pillarTime - termTime (분, 소수 첫째 자리 반올림) */
  correctionMinutes: number;
  equationOfTimeMinutes: number | null;
  notes: string[];
}

function wallToMs(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, 0);
}

function msToWall(ms: number): WallTime {
  // 보정 결과의 초 단위는 버리지 않고 반올림한다 (분 단위 입력과 맞추기 위함).
  const d = new Date(Math.round(ms / MIN) * MIN);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** 해당 절대 순간에 timeZone의 UTC 오프셋(분) */
export function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  let fmt = offsetFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    offsetFormatterCache.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / MIN);
}

/**
 * 현지 벽시계 → UTC ms.
 * 서머타임 시작 시 존재하지 않는 시각은 전환 이후 오프셋으로, 종료 시 중복되는 시각은
 * 앞(서머타임) 오프셋으로 해석하고 notes에 기록한다.
 */
export function localWallToUtc(w: WallTime, timeZone: string): { utcMs: number; offset: number; note?: string } {
  const wallMs = wallToMs(w);
  const candidates = new Set<number>();
  for (const probe of [wallMs - 14 * 60 * MIN, wallMs, wallMs + 14 * 60 * MIN]) {
    candidates.add(tzOffsetMinutes(probe, timeZone));
  }
  const valid: number[] = [];
  for (const off of candidates) {
    const utc = wallMs - off * MIN;
    if (tzOffsetMinutes(utc, timeZone) === off) valid.push(off);
  }
  if (valid.length === 0) {
    // 존재하지 않는 시각 (서머타임 시작 직후)
    const before = tzOffsetMinutes(wallMs - 14 * 60 * MIN, timeZone);
    const after = tzOffsetMinutes(wallMs + 14 * 60 * MIN, timeZone);
    // 전환 전 오프셋으로 환산하면 전환 이후의 실제 순간이 된다 (예: 02:30 → 03:30 서머타임).
    const off = Math.min(before, after);
    return { utcMs: wallMs - off * MIN, offset: off, note: "입력 시각이 서머타임 전환으로 존재하지 않는 시각이라 전환 이후로 해석했습니다." };
  }
  valid.sort((a, b) => b - a);
  const off = valid[0];
  return {
    utcMs: wallMs - off * MIN,
    offset: off,
    note: valid.length > 1 ? "입력 시각이 서머타임 종료로 두 번 나타나는 시각이라 서머타임 기준으로 해석했습니다." : undefined,
  };
}

/** 균시차(분). NOAA 근사식, 오차 약 ±0.5분. */
export function equationOfTimeMinutes(utcMs: number): number {
  const d = new Date(utcMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utcMs - start) / 86_400_000) + 1;
  const isLeap = new Date(Date.UTC(d.getUTCFullYear(), 1, 29)).getUTCMonth() === 1;
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  const g = ((2 * Math.PI) / (isLeap ? 366 : 365)) * (dayOfYear - 1 + (hour - 12) / 24);
  return (
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  );
}

export function normalizeBirthTime(
  wall: WallTime,
  settings: CalcSettings,
  longitude: number | null,
  timeZone = "Asia/Seoul",
): TimeNormalization {
  const notes: string[] = [];
  let utcMs: number;
  let recordedOffset = KST_OFFSET_MIN;
  if (settings.applyHistoricalOffset) {
    const r = localWallToUtc(wall, timeZone);
    utcMs = r.utcMs;
    recordedOffset = r.offset;
    if (r.note) notes.push(r.note);
  } else {
    utcMs = wallToMs(wall) - KST_OFFSET_MIN * MIN;
  }
  const historicalAdjusted = recordedOffset !== KST_OFFSET_MIN;
  if (historicalAdjusted) {
    notes.push(`기록 시각의 UTC 오프셋이 ${formatOffset(recordedOffset)}이라 UTC+09:00 기준으로 환산했습니다.`);
  }
  const termTime = msToWall(utcMs + KST_OFFSET_MIN * MIN);

  let pillarMs = utcMs + KST_OFFSET_MIN * MIN;
  let eot: number | null = null;
  if (settings.correction !== "none") {
    if (longitude === null) throw new Error("시간 보정에는 경도가 필요합니다.");
    pillarMs = utcMs + longitude * 4 * MIN;
    if (settings.correction === "tst") {
      eot = equationOfTimeMinutes(utcMs);
      pillarMs += eot * MIN;
    }
  }
  const pillarTime = msToWall(pillarMs);
  const correctionMinutes = Math.round(((pillarMs - (utcMs + KST_OFFSET_MIN * MIN)) / MIN) * 10) / 10;
  return {
    termTime,
    pillarTime,
    recordedUtcOffsetMinutes: recordedOffset,
    historicalAdjusted,
    correctionMinutes,
    equationOfTimeMinutes: eot === null ? null : Math.round(eot * 10) / 10,
    notes,
  };
}

export function formatOffset(min: number): string {
  const sign = min >= 0 ? "+" : "-";
  const a = Math.abs(min);
  return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

export function addMinutes(w: WallTime, minutes: number): WallTime {
  return msToWall(wallToMs(w) + minutes * MIN);
}
