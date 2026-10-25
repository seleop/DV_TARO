import { Solar } from "lunar-javascript";
import { describe, expect, it } from "vitest";
import { homeDays } from "@/lib/home";
import { dayTalk, daySubline, kstDateKey, moonWord, pillarHanja, type HomeDay } from "@/lib/home-day";

describe("홈 오늘 줄 (날짜·음력·일진)", () => {
  it("한국 날짜로 오늘·내일을 만든다 (음력은 KASI, 일진은 교차검증 값)", async () => {
    const now = new Date(Date.UTC(2026, 9, 25, 3)); // 한국 2026-10-25 12:00
    const [today, tomorrow] = await homeDays(now);
    expect(today).toEqual({ date: "2026-10-25", label: "10월 25일 일요일", lunar: { month: 9, day: 15, leap: false }, pillar: "임신" });
    expect(tomorrow.date).toBe("2026-10-26");
    expect(tomorrow.label).toBe("10월 26일 월요일");
    expect(tomorrow.pillar).toBe("계유"); // 일진은 하루에 한 칸씩
    // 다른 라이브러리로도 같은 일진 (壬申)
    expect(pillarHanja(today.pillar!)).toBe(Solar.fromYmd(2026, 10, 25).getLunar().getDayInGanZhi());
  });

  it("한국 자정에 날짜가 바뀐다", async () => {
    const [before] = await homeDays(new Date(Date.UTC(2026, 9, 25, 14, 59))); // 한국 23:59
    const [after] = await homeDays(new Date(Date.UTC(2026, 9, 25, 15, 0))); // 한국 다음 날 00:00
    expect(before.date).toBe("2026-10-25");
    expect(after.date).toBe("2026-10-26");
    expect(kstDateKey(Date.UTC(2026, 9, 25, 15, 0))).toBe("2026-10-26");
  });

  it("윤달은 '윤'을 붙인다", async () => {
    // 2025년 음력 윤6월 1일 = 양력 2025-07-25
    const [d] = await homeDays(new Date(Date.UTC(2025, 6, 25, 3)));
    expect(d.lunar).toEqual({ month: 6, day: 1, leap: true });
    expect(daySubline(d)).toMatch(/^음력 윤6\.1 초하루 · /);
  });

  it("둘째 줄과 마스코트 말", () => {
    const d: HomeDay = { date: "2026-10-25", label: "10월 25일 일요일", lunar: { month: 9, day: 15, leap: false }, pillar: "임신" };
    expect(daySubline(d)).toBe("음력 9.15 보름 · 임신일 壬申");
    expect(dayTalk(d)).toEqual(["오늘은 임신일이에요.\n큰 바다(壬)와 원숭이(申)의 날이래요", "음력으로는 9월 15일, 보름이에요.\n밤하늘에 둥근 보름달이 떠요"]);
    // 받침 있는 낱말 뒤에는 "과", 초하루는 "예요"
    const d2: HomeDay = { ...d, lunar: { month: 10, day: 1, leap: false }, pillar: "정묘" };
    expect(dayTalk(d2)).toEqual(["오늘은 정묘일이에요.\n촛불(丁)과 토끼(卯)의 날이래요", "음력으로는 10월 1일, 초하루예요.\n달이 숨어 새 달이 시작되는 날이에요"]);
    expect(dayTalk({ ...d, lunar: { month: 9, day: 3, leap: false } })[1]).toBe("음력으로는 9월 3일이에요.\n저녁 하늘에 가는 초승달이 떠요");
    // 검증 실패한 값은 빼고 보여 준다
    expect(daySubline({ ...d, pillar: null })).toBe("음력 9.15 보름");
    expect(dayTalk({ ...d, pillar: null, lunar: null })).toEqual([]);
    expect(moonWord(2)).toBeNull();
    expect(pillarHanja("??")).toBeNull();
  });

  it("60갑자가 모두 한자로 바뀐다", async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const [d] = await homeDays(new Date(Date.UTC(2026, 0, 1 + i, 3)));
      expect(d.pillar, d.date).toBeTruthy();
      expect(pillarHanja(d.pillar!), d.date).toBeTruthy();
      seen.add(d.pillar!);
    }
    expect(seen.size).toBe(60);
  });
});
