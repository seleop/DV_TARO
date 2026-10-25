import { describe, expect, it } from "vitest";
import { BRANCHES, STEMS } from "@/lib/saju/ganji";
import { currentDaewoonIndex, explainBranch, explainPillar, explainStem, explainTenGod } from "@/lib/saju-glossary";

describe("원국 판 짚기 풀이", () => {
  it("천간 10자·지지 12자 모두 풀이가 있고, 말풍선에 들어갈 길이다", () => {
    for (const s of STEMS) {
      const t = explainStem(s, true)!;
      expect(t.length).toBeLessThan(90);
    }
    for (const b of BRANCHES) expect(explainBranch(b)!.length).toBeLessThan(60);
  });

  it("받침에 맞는 조사와 어미", () => {
    expect(explainStem("갑", false)).toBe("갑(甲)은 양의 나무(목), 곧게 위로 뻗는 큰 나무야.");
    expect(explainStem("계", true)).toBe("계(癸)는 음의 물(수), 조용히 스며들어 적시는 비와 이슬이야. 일간이라 바로 너 자신을 뜻해.");
    expect(explainBranch("유")).toBe("유(酉)는 닭, 한가을의 쇠(금) 기운이야.");
    expect(explainBranch("묘")).toBe("묘(卯)는 토끼, 한봄의 나무(목) 기운이야.");
  });

  it("기둥 풀이: 시각을 모르거나 확정되지 않으면 이유를 덧붙인다", () => {
    expect(explainPillar("hour", "unknown-time")).toContain("태어난 시각을 몰라서");
    expect(explainPillar("year", "unresolved")).toContain("풀이에 쓰지 않았어");
    expect(explainPillar("day")).toContain("일간");
  });

  it("십신 풀이", () => {
    expect(explainTenGod("정재")).toContain("차곡차곡");
    expect(explainTenGod("없는말")).toBeNull();
  });
});

describe("지금 몇 번째 대운인지", () => {
  const birth = { year: 1992, month: 10, day: 24 };
  it("만 나이로 대운 시작 시점부터 10년씩 센다", () => {
    // 2026-10-26 만 34세 0개월, 대운 3세 4개월 시작 → (408-40)/120 = 3.06 → 4번째(인덱스 3)
    expect(currentDaewoonIndex("약 3세 4개월", birth, new Date("2026-10-26T03:00:00Z"), 8)).toBe(3);
    expect(currentDaewoonIndex("약 3세 4개월", birth, new Date("1994-01-01T03:00:00Z"), 8)).toBe(-1);
    expect(currentDaewoonIndex("약 3세 4개월", birth, new Date("2200-01-01T03:00:00Z"), 8)).toBe(7);
  });

  it("시작 시점이 범위로만 있으면 모른다(null)", () => {
    expect(currentDaewoonIndex("3세 1개월 ~ 3세 9개월 (엔진별 계산 방식 차이)", birth, new Date(), 8)).toBeNull();
  });
});
