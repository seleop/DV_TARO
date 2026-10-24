import { describe, expect, it } from "vitest";
import { greetingLines, pickGreeting, timeSlot } from "@/lib/home-greeting";

describe("홈 인사 문구", () => {
  it("시간대 경계", () => {
    expect([0, 4, 5, 10, 11, 13, 14, 17, 18, 21, 22, 23].map(timeSlot)).toEqual([
      "dawn",
      "dawn",
      "morning",
      "morning",
      "noon",
      "noon",
      "afternoon",
      "afternoon",
      "evening",
      "evening",
      "night",
      "night",
    ]);
  });

  it("요일 문구가 있는 날은 그 문구로 시작하고, 누르면 차례로 돌아온다", () => {
    const sat = new Date(2026, 9, 24, 19, 0); // 토요일 저녁
    const lines = greetingLines(sat);
    expect(pickGreeting(sat, 0)).toBe("주말엔 여유롭게 운세 한 판 어때요?");
    expect(lines.length).toBeGreaterThan(1);
    expect(pickGreeting(sat, lines.length)).toBe(pickGreeting(sat, 0));
    expect(new Set(lines.map((_, i) => pickGreeting(sat, i))).size).toBe(lines.length);
  });

  it("요일 문구가 없는 날은 시간대 문구만 쓰고 날짜마다 첫 문구가 바뀐다", () => {
    const tue = new Date(2026, 9, 20, 8, 0);
    const wed = new Date(2026, 9, 21, 8, 0);
    expect(greetingLines(tue)).toEqual(greetingLines(wed));
    expect(pickGreeting(tue, 0)).not.toBe(pickGreeting(wed, 0));
  });
});
