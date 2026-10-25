import "server-only";
import { solarToLunar } from "manseryeok";
import { dailyReadingCacheKey } from "./ai/interpret";
import { findReadingByCacheKey } from "./repo/records";
import { verifiedDateGanji } from "./saju/service";
import type { HomeDay } from "./home-day";

/** 한국 날짜 "YYYY-MM-DD". 오늘의 운세가 쓰는 날짜(verifiedDateGanji)와 같은 기준이다 */
export function kstDateString(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

/**
 * 오늘(한국 날짜) 내 사주로 오늘의 운세를 이미 봤는지. 홈 큰 카드의 "오늘 봤어요" 표시용.
 * 저장된 결과를 찾기만 하고 AI는 부르지 않는다. 프롬프트 버전이 바뀌면 새로 만들어야 하므로 안 본 것으로 친다.
 */
export async function hasViewedDailyToday(userId: string, calculationId: string, now = new Date()) {
  return (await findReadingByCacheKey(userId, dailyReadingCacheKey(calculationId, kstDateString(now)))) !== null;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 한국 날짜 하루의 오늘 줄 값. 음력은 KASI 기준(manseryeok), 일진은 오늘의 운세와 같은 교차검증 값 */
async function homeDay(at: Date): Promise<HomeDay> {
  const date = kstDateString(at);
  const [y, m, d] = date.split("-").map(Number);
  let lunar: HomeDay["lunar"] = null;
  try {
    const l = solarToLunar(y, m, d);
    lunar = { month: l.month, day: l.day, leap: l.isLeapMonth };
  } catch {
    lunar = null; // 지원 범위 밖 등: 음력만 빼고 보여 준다
  }
  const g = await verifiedDateGanji(at).catch(() => null);
  return { date, label: `${m}월 ${d}일 ${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}요일`, lunar, pillar: g?.date === date ? g.day : null };
}

/**
 * 홈 위쪽 오늘 줄: 오늘과 내일(한국 날짜). 앱을 켜 둔 채 자정이 지나도 브라우저가 바로 내일 값으로 바꾼다.
 * 계산은 서버에서만 한다 (음력 표·사주 엔진을 브라우저로 보내지 않게)
 */
export async function homeDays(now = new Date()): Promise<HomeDay[]> {
  return Promise.all([homeDay(now), homeDay(new Date(now.getTime() + 24 * 3600_000))]);
}
