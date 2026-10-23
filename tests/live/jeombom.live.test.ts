/**
 * 실제 외부 API 연동 검증 (네트워크 필요). `npm run test:live`
 * 일반 `npm test`에는 포함되지 않는다. 결과는 실행 시점의 외부 서비스 상태에 따라 달라질 수 있다.
 */
import { describe, expect, it } from "vitest";
import { jeombomEngine, jeombomLunarDayPillar } from "@/lib/saju/engines/jeombom";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { pillarToString } from "@/lib/saju/ganji";
import { REFERENCE_CASES } from "../fixtures/reference-cases";

const ctx = { fetchImpl: fetch, timeoutMs: 10_000, maxRetries: 1 };

describe("점봄 만세력 API 실연동", () => {
  for (const rc of REFERENCE_CASES) {
    it(`${rc.id} 기준값과 일치`, async () => {
      const input = { solarDate: rc.wall, termTime: rc.wall, pillarTime: rc.wall, timeKnown: true, dayBoundary: "midnight" as const, gender: null, lunarSource: null };
      const e = jeombomEngine as SajuEngine;
      const n = e.normalize(await e.calculate(input, ctx), input);
      expect(e.validate(n, input).ok).toBe(true);
      expect({ year: pillarToString(n.pillars.year), month: pillarToString(n.pillars.month), day: pillarToString(n.pillars.day), hour: pillarToString(n.pillars.hour) }).toEqual(rc.expected);
    });
  }

  it("한·중 음력 차이일(음력 1997-01-01)을 KASI 기준(1997-02-08, 신사일)으로 계산", async () => {
    expect(await jeombomLunarDayPillar({ year: 1997, month: 1, day: 1, isLeapMonth: false }, ctx)).toBe("신사");
  });

  it("[알려진 결함 감시] 윤달 입력(2020 윤4월 1일)이 여전히 평달로 계산되는지", async () => {
    const day = await jeombomLunarDayPillar({ year: 2020, month: 4, day: 1, isLeapMonth: true }, ctx);
    // 병인이 나오면 결함이 고쳐진 것이다. 그때는 src/lib/saju/lunar.ts의 윤달 예외 처리를 다시 검토한다.
    expect(["병신", "병인"]).toContain(day);
    if (day === "병인") console.warn("점봄 API 윤달 결함이 해결된 것으로 보입니다. lunar.ts 예외 처리를 재검토하세요.");
  });
});
