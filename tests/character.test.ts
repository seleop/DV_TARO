import { describe, expect, it } from "vitest";
import {
  ARM_POSE,
  DIZZY_TAPS,
  MOODS,
  PROPS,
  SCENES,
  baseLook,
  linesFor,
  moodFromTarot,
  nextIdleDelay,
  pickIdleBehavior,
  pickTapReaction,
  pickWeighted,
  propFor,
} from "@/lib/character";
import { DailyReadingSchema, HoroscopeReadingSchema } from "@/lib/ai/schemas";

/** 정해진 값을 차례로 돌려주는 난수 */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("캐릭터 표정·소품", () => {
  it("장면별 기본 표정과 소품", () => {
    expect(baseLook("default").expression).toBe("neutral");
    expect(baseLook("thinking")).toEqual({ expression: "thinking", loop: "sway" });
    expect(propFor("thinking")).toBe("crystal");
    expect(propFor("tarot")).toBe("cards");
    expect(propFor("star")).toBe("telescope");
    expect(propFor("saju")).toBe("books");
  });

  it("결과 분위기가 있으면 장면보다 우선한다", () => {
    expect(baseLook("happy", "great").expression).toBe("excited");
    expect(baseLook("star", "careful").expression).toBe("worried");
    expect(propFor("happy", "great")).toBe("confetti");
    expect(propFor("star", "calm")).toBe("tea");
  });

  it("모든 소품에 팔 자세가 있고, 모든 장면·분위기에 대사가 있다", () => {
    for (const p of PROPS) expect(ARM_POSE[p]).toBeDefined();
    for (const k of [...SCENES, ...MOODS, "dizzy" as const]) expect(linesFor(k).length).toBeGreaterThan(0);
  });
});

describe("대기 동작", () => {
  it("가중치에 따라 고른다", () => {
    const items = [
      ["a", 1],
      ["b", 3],
    ] as const;
    expect(pickWeighted(items, () => 0)).toBe("a");
    expect(pickWeighted(items, () => 0.3)).toBe("b");
    expect(pickWeighted(items, () => 0.9999)).toBe("b");
  });

  it("대부분은 눈 깜빡임이고, 오래 두기 전에는 하품하지 않는다", () => {
    expect(pickIdleBehavior("default", 0, seq(0.9, 0))).toEqual({ kind: "blink" });
    for (let r = 0; r < 1; r += 0.01) {
      const b = pickIdleBehavior("default", 1000, seq(0.5, r));
      expect(b.kind === "action" && b.action === "yawn").toBe(false);
    }
  });

  it("오래 건드리지 않으면 하품할 수 있다 (점치는 중에는 하지 않음)", () => {
    expect(pickIdleBehavior("default", 60_000, seq(0.5, 0.99))).toEqual({ kind: "action", action: "yawn" });
    expect(pickIdleBehavior("thinking", 60_000, seq(0.5, 0.99))).toEqual({ kind: "action", action: "tilt" });
  });

  it("다음 동작까지 2.2~6초", () => {
    expect(nextIdleDelay(() => 0)).toBe(2200);
    expect(nextIdleDelay(() => 0.999)).toBeLessThan(6000);
  });
});

describe("터치 반응", () => {
  it("직전 대사를 반복하지 않는다", () => {
    const first = linesFor("default")[0];
    const r = pickTapReaction("default", null, 1, first, () => 0);
    expect(r.line).not.toBe(first);
  });

  it("연타하면 어지러워한다", () => {
    const r = pickTapReaction("default", null, DIZZY_TAPS, null, () => 0);
    expect(r.action).toBe("spin");
    expect(linesFor("dizzy")).toContain(r.line);
  });

  it("결과 분위기에 맞는 대사를 쓴다", () => {
    const r = pickTapReaction("happy", "great", 1, null, () => 0);
    expect(linesFor("great")).toContain(r.line);
  });
});

describe("타로 분위기", () => {
  it("정방향 비율로 정한다", () => {
    const up = { reversed: false };
    const down = { reversed: true };
    expect(moodFromTarot([up, up, up])).toBe("great");
    expect(moodFromTarot([up])).toBe("good");
    expect(moodFromTarot([up, up, down])).toBe("good");
    expect(moodFromTarot([up, down, down])).toBe("calm");
    expect(moodFromTarot([down])).toBe("careful");
    expect(moodFromTarot([])).toBe("calm");
  });
});

describe("AI 응답의 mood", () => {
  it("예전에 저장된 해석(mood 없음)도 읽고, 잘못된 값은 거부한다", () => {
    const daily = {
      headline: "제목",
      highlights: [{ emoji: "✨", text: "한 줄" }],
      love: "a",
      work: "b",
      luck: "c",
      food: { name: "국수", reason: "이유" },
      lucky: { color: "보라", item: "메모장" },
      tip: "팁",
      evidence: [{ claim: "c", basis: "b" }],
      disclaimer: "참고용",
    };
    expect(DailyReadingSchema.safeParse(daily).success).toBe(true);
    expect(DailyReadingSchema.safeParse({ ...daily, mood: "good" }).success).toBe(true);
    expect(DailyReadingSchema.safeParse({ ...daily, mood: "terrible" }).success).toBe(false);
    const horo = { headline: "h", overall: "o", love: "l", work: "w", money: "m", tip: "t", disclaimer: "d" };
    expect(HoroscopeReadingSchema.safeParse({ ...horo, mood: "careful" }).success).toBe(true);
  });
});
