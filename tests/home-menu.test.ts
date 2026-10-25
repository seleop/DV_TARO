import { describe, expect, it } from "vitest";
import { HOME_MENUS, menuLine } from "@/lib/home-menu";
import { SCENES } from "@/lib/character";
import { DEFAULT_MASCOT_NAME, displayMascotName, mascotNameError, normalizeMascotName } from "@/lib/mascot-name";

describe("홈 메뉴 카드", () => {
  it("네 메뉴, 겹치지 않는 주소, 있는 장면(의상)만", () => {
    expect(HOME_MENUS.map((m) => m.id)).toEqual(["today", "saju", "tarot", "horoscope"]);
    expect(new Set(HOME_MENUS.map((m) => m.href)).size).toBe(4);
    for (const m of HOME_MENUS) expect(SCENES).toContain(m.pose);
  });

  it("카드 설명에 지어 준 이름이 조사와 함께 들어간다", () => {
    const today = HOME_MENUS[0];
    expect(today.sub("루나")).toBe("루나가 점쳐 둔 오늘의 흐름");
    expect(today.sub("별빛")).toBe("별빛이 점쳐 둔 오늘의 흐름");
  });

  it("말풍선은 차례로 돌고, 오늘 운세를 봤으면 첫 말이 바뀐다", () => {
    const today = HOME_MENUS[0];
    expect(menuLine(today, 0, false)).toBe(today.lines[0]);
    expect(menuLine(today, 0, true)).toBe("오늘 운세 다시 볼까요?");
    expect(menuLine(today, today.lines.length, false)).toBe(today.lines[0]);
    expect(menuLine(HOME_MENUS[2], 1, true)).toBe(HOME_MENUS[2].lines[1]);
  });
});

describe("마스코트 이름 규칙", () => {
  it("공백 정리, 길이·글자 검사", () => {
    expect(normalizeMascotName("  반짝   별  ")).toBe("반짝 별");
    expect(mascotNameError("루나")).toBeNull();
    expect(mascotNameError("Luna 2")).toBeNull();
    expect(mascotNameError("별☆")).toBeNull();
    expect(mascotNameError("  ")).toMatch(/적어/);
    expect(mascotNameError("아홉글자짜리이름임")).toMatch(/8자/);
    expect(mascotNameError("<별>")).toMatch(/쓸 수/);
  });

  it("아직 짓지 않았으면 기본 이름", () => {
    expect(displayMascotName(null)).toBe(DEFAULT_MASCOT_NAME);
    expect(displayMascotName("코코")).toBe("코코");
  });
});
