import "server-only";
import { dailyReadingCacheKey } from "./ai/interpret";
import { findReadingByCacheKey } from "./repo/records";

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
