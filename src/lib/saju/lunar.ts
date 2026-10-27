import { calculateFourPillars, lunarToSolar } from "manseryeok";
import { Lunar, LunarYear } from "lunar-javascript";
import type { EngineContext } from "./engines/types";
import { jeombomLunarDayPillar } from "./engines/jeombom";

export type LunarConversionStatus =
  | "VERIFIED" // 두 라이브러리 변환 결과 일치
  | "VERIFIED_BY_INDEPENDENT_SOURCE" // 한·중 음력 차이로 불일치했으나 점봄 API가 KASI 기준 날짜를 뒷받침
  | "UNVERIFIED" // 불일치를 해소하지 못함
  | "INVALID_DATE"; // 존재하지 않는 음력 날짜(윤달 없음 등)

export interface LunarConversionResult {
  status: LunarConversionStatus;
  solar: { year: number; month: number; day: number } | null;
  candidates: { kasi: string | null; chinese: string | null };
  notes: string[];
}

interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

const ymd = (s: { year: number; month: number; day: number }) =>
  `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;

function kasiConvert(l: LunarDate) {
  try {
    return lunarToSolar(l.year, l.month, l.day, l.isLeapMonth);
  } catch {
    return null;
  }
}

function chineseConvert(l: LunarDate) {
  try {
    if (l.isLeapMonth && LunarYear.fromYear(l.year).getLeapMonth() !== l.month) return null;
    const s = Lunar.fromYmd(l.year, l.isLeapMonth ? -l.month : l.month, l.day).getSolar();
    // 6tail은 존재하지 않는 30일을 다음 달로 넘기기도 하므로 역변환으로 확인한다.
    const back = s.getLunar();
    if (back.getDay() !== l.day || Math.abs(back.getMonth()) !== l.month || back.getYear() !== l.year) return null;
    return { year: s.getYear(), month: s.getMonth(), day: s.getDay() };
  } catch {
    return null;
  }
}

function dayPillarOf(s: { year: number; month: number; day: number }) {
  return calculateFourPillars({ year: s.year, month: s.month, day: s.day, hour: 12, minute: 0 }).toObject().day;
}

/**
 * 음력 → 양력 변환 (단일 출처: 한국천문연구원 KASI 정본, manseryeok 내장 표).
 * 2026-10-27 교차검증 철회 후의 기본 경로. 존재하지 않는 날짜(없는 윤달 등)만 걸러 낸다.
 */
export function kasiLunarConversion(l: LunarDate): LunarConversionResult {
  const kasi = kasiConvert(l);
  const candidates = { kasi: kasi ? ymd(kasi) : null, chinese: null };
  if (!kasi) return { status: "INVALID_DATE", solar: null, candidates, notes: ["존재하지 않는 음력 날짜입니다(윤달 여부를 확인하세요)."] };
  return { status: "VERIFIED", solar: kasi, candidates, notes: ["한국천문연구원(KASI) 음력 기준으로 변환했어요."] };
}

/**
 * 음력 → 양력 변환 검증 (예전 세 엔진 교차검증용).
 * 기본은 KASI 정본(manseryeok)과 중국 음력 계산(lunar-javascript)의 일치 여부를 본다.
 * 다르면(한·중 음력 차이 가능) 점봄 API의 음력 입력 일주로 어느 쪽이 맞는지 독립 확인한다.
 * 다수결이 아니라 "KASI 날짜를 독립 출처가 뒷받침하는가"로 판정한다.
 */
export async function verifyLunarConversion(
  l: LunarDate,
  opts: { jeombomEnabled: boolean; ctx: EngineContext },
): Promise<LunarConversionResult> {
  const kasi = kasiConvert(l);
  const cn = chineseConvert(l);
  const candidates = { kasi: kasi ? ymd(kasi) : null, chinese: cn ? ymd(cn) : null };
  if (!kasi && !cn) {
    return { status: "INVALID_DATE", solar: null, candidates, notes: ["존재하지 않는 음력 날짜입니다(윤달 여부를 확인하세요)."] };
  }
  if (kasi && cn && candidates.kasi === candidates.chinese) {
    return { status: "VERIFIED", solar: kasi, candidates, notes: [] };
  }
  const notes = ["KASI(한국) 음력과 중국 음력 변환 결과가 다릅니다."];
  if (!kasi) {
    notes.push("KASI 기준으로는 존재하지 않는 날짜입니다.");
    return { status: "UNVERIFIED", solar: null, candidates, notes };
  }
  if (l.isLeapMonth) {
    // 2026-10-23 실측: 점봄 API는 leap=1 요청에 leapMonth=true를 반환하면서도 평달 날짜로 계산했다
    // (음력 2020 윤4월 1일 → 일주 병신 = 양력 2020-04-23, KASI 정답은 2020-05-23 병인).
    notes.push("점봄 API는 윤달 입력을 평달로 계산하는 것이 관찰되어 윤달 독립 검증에 사용하지 않습니다.");
    return { status: "UNVERIFIED", solar: kasi, candidates, notes };
  }
  if (!opts.jeombomEnabled) {
    notes.push("독립 검증용 외부 엔진이 꺼져 있어 확정하지 못했습니다.");
    return { status: "UNVERIFIED", solar: kasi, candidates, notes };
  }
  try {
    const remoteDay = await jeombomLunarDayPillar(l, opts.ctx);
    if (remoteDay === dayPillarOf(kasi)) {
      notes.push("점봄 API의 음력 변환 결과가 KASI 기준 날짜와 일치합니다.");
      return { status: "VERIFIED_BY_INDEPENDENT_SOURCE", solar: kasi, candidates, notes };
    }
    notes.push("점봄 API 결과도 KASI 기준 날짜와 다릅니다.");
  } catch {
    notes.push("점봄 API 호출에 실패해 독립 검증을 하지 못했습니다.");
  }
  return { status: "UNVERIFIED", solar: kasi, candidates, notes };
}
