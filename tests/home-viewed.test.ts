import { beforeEach, describe, expect, it } from "vitest";
import { generateDailyReading } from "@/lib/ai/interpret";
import { hasViewedDailyToday, kstDateString } from "@/lib/home";
import { getCalculation, saveCalculation } from "@/lib/repo/records";
import { parseBirthInput } from "@/lib/saju/input";
import { calculateSaju, verifiedDateGanji } from "@/lib/saju/service";
import { lunarJavascriptEngine } from "@/lib/saju/engines/lunar-javascript";
import { manseryeokEngine } from "@/lib/saju/engines/manseryeok";
import type { SajuEngine } from "@/lib/saju/engines/types";
import { freshEnv, makeUser } from "./helpers/db";

const LOCAL = [manseryeokEngine, lunarJavascriptEngine] as SajuEngine[];

async function storedCalc(userId: string) {
  const input = parseBirthInput({ calendar: "solar", year: 1992, month: 10, day: 24, timeKnown: true, hour: 5, minute: 30 });
  const c = await calculateSaju(userId, input, { engines: LOCAL, jeombomEnabled: false });
  return (await getCalculation(userId, await saveCalculation(userId, input, c, null)))!;
}

describe("홈: 오늘 운세 봤는지", () => {
  beforeEach(async () => freshEnv({ LIMIT_AI_PER_USER_PER_MINUTE: "10", LIMIT_AI_PER_USER_PER_DAY: "20", BUDGET_MONTHLY_USD: "20" }));

  it("한국 날짜 기준 (오늘의 운세와 같은 날짜)", async () => {
    const before = new Date(Date.UTC(2024, 0, 1, 14, 59)); // 한국 1월 1일 23:59
    const after = new Date(Date.UTC(2024, 0, 1, 15, 0)); // 한국 1월 2일 00:00
    expect(kstDateString(before)).toBe("2024-01-01");
    expect(kstDateString(after)).toBe("2024-01-02");
    expect(kstDateString(after)).toBe((await verifiedDateGanji(after))!.date);
  });

  it("오늘 운세를 만들면 그날만 봤다고 표시하고, 다른 사용자·다른 사주에는 표시하지 않는다", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const calc = await storedCalc(u.id);
    const calc2 = await storedCalc(other.id);
    const now = new Date(Date.UTC(2024, 0, 1, 3));
    expect(await hasViewedDailyToday(u.id, calc.id, now)).toBe(false);

    await generateDailyReading(u.id, calc, { regenerate: false, now });
    expect(await hasViewedDailyToday(u.id, calc.id, now)).toBe(true);
    expect(await hasViewedDailyToday(u.id, calc.id, new Date(Date.UTC(2024, 0, 1, 14, 59)))).toBe(true);
    expect(await hasViewedDailyToday(u.id, calc.id, new Date(Date.UTC(2024, 0, 1, 15, 0)))).toBe(false);
    expect(await hasViewedDailyToday(other.id, calc.id, now)).toBe(false);
    expect(await hasViewedDailyToday(other.id, calc2.id, now)).toBe(false);
  });
});
