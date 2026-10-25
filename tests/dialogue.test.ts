import { describe, expect, it } from "vitest";
import { DailyDialogueSchema, SajuDialogueSchema, TarotDialogueSchema, type DailyReading, type SajuReading } from "@/lib/ai/schemas";
import { clip, cueForMood, dailyDialogueFallback, motionForCue, sajuChapters, sajuDialogueFallback, tarotDialogueFallback, tomorrowTeaser } from "@/lib/dialogue";

const long = "가나다라마바사. ".repeat(80);

const saju: SajuReading = {
  summary: long,
  personality: long,
  strengths: ["꾸준해요."],
  cautions: ["서두르지 마세요."],
  career: long,
  wealth: "재물 이야기.",
  relationships: "사람 이야기.",
  yearlyOutlook: { year: 2026, yearGanji: "병오", text: long },
  evidence: [{ claim: "a", basis: "b" }],
  limitations: [],
  disclaimer: "참고용",
};

const daily: DailyReading = {
  headline: "천천히 데워지는 날",
  highlights: [{ emoji: "☕", text: "오후에 손이 풀려요." }],
  love: long,
  work: "일 이야기.",
  luck: "행운 이야기.",
  food: { name: "국수", reason: "따뜻해서" },
  lucky: { color: "보라색", item: "메모장" },
  tip: long,
  evidence: [{ claim: "a", basis: "b" }],
  mood: "careful",
  disclaimer: "참고용",
};

describe("별이 동작 신호", () => {
  it("새 동작 시트가 있으면 쓰고, 없으면 지금 있는 동작으로 대체한다", () => {
    const none = () => false;
    expect(motionForCue("explain", none)).toBe("idle");
    expect(motionForCue("point", none)).toBe("nod");
    expect(motionForCue("comfort", none)).toBe("idle");
    expect(motionForCue("anticipate", none)).toBe("reveal");
    expect(motionForCue("point", (s) => s === "point")).toBe("point");
    expect(motionForCue("comfort", (s) => s === "sit")).toBe("sit");
  });

  it("결과 분위기에 맞는 공개 신호", () => {
    expect(cueForMood("great")).toBe("celebrate");
    expect(cueForMood("careful")).toBe("comfort");
    expect(cueForMood(undefined)).toBe("reveal");
  });
});

describe("대사 만들기 (예전 해석·모의 응답)", () => {
  it("긴 문장은 문장 끝에서 자르고, 짧으면 그대로", () => {
    expect(clip("짧아요.", 10)).toBe("짧아요.");
    expect(clip("첫 문장이에요. 둘째 문장이 아주 길어서 잘려야 해요.", 20)).toBe("첫 문장이에요.");
    expect(clip("가".repeat(50), 10)).toHaveLength(10);
  });

  it("사주: 엄격 스키마를 통과하고 장별로 묶인다", () => {
    const d = sajuDialogueFallback(saju, { day: { ganji: "계유", hanja: "癸酉" }, dayMaster: { stem: "계", element: "수" }, elements: { 목: 0, 화: 1, 토: 2, 금: 3, 수: 2 } });
    expect(SajuDialogueSchema.safeParse(d).success).toBe(true);
    expect(sajuChapters(d).map((c) => c.id)).toEqual(["chart", "self", "work", "people", "flow"]);
    expect(d.beats.find((b) => b.focus === "elements")!.say).toContain("금 기운이 3개");
  });

  it("사주: 일주를 모르면 원국 대사 없이도 스키마를 통과한다", () => {
    const d = sajuDialogueFallback(saju, { day: null, dayMaster: null, elements: null });
    expect(SajuDialogueSchema.safeParse(d).success).toBe(true);
    expect(sajuChapters(d)[0].id).toBe("self");
  });

  it("오늘의 운세: 엄격 스키마 통과, 쉬어가기 결과는 위로 신호로 시작", () => {
    const d = dailyDialogueFallback(daily);
    expect(DailyDialogueSchema.safeParse(d).success).toBe(true);
    expect(d.opening[0].cue).toBe("comfort");
    expect(d.step.action.length).toBeLessThanOrEqual(60);
  });

  it("타로: 카드 순서대로, 역방향 카드를 추천 질문으로", () => {
    const drawn = [
      { position: "과거", nameKo: "은둔자", reversed: false, keywords: ["성찰"] },
      { position: "현재", nameKo: "전차", reversed: true, keywords: ["방향 상실"] },
    ];
    const d = tarotDialogueFallback({ overall: long, advice: "고삐를 하나로.", cards: drawn.map((c) => ({ position: c.position, cardName: c.nameKo, interpretation: long })) }, drawn);
    expect(TarotDialogueSchema.safeParse(d).success).toBe(true);
    expect(d.cards.map((c) => c.position)).toEqual(["과거", "현재"]);
    expect(d.cards[0].beats[0].say).toBe("과거 자리에 '은둔자'가 나왔어.");
    expect(d.cards[1].beats[0].say).toBe("현재 자리에 '전차' 역방향이 나왔어.");
    expect(d.suggestions[2].question).toContain("전차");
  });

  it("내일 예고는 십신마다 미리 써 둔 문구", () => {
    expect(tomorrowTeaser("정재")).toBe("내일은 '정재'의 날, 꼼꼼함이 빛나는 날이야. 아침에 또 보자!");
    expect(tomorrowTeaser(null)).toBe("내일 아침에 또 보자!");
  });
});
