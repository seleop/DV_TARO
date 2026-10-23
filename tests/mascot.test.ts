import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MASCOT_POSTER, MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { durationMs, frameAt, framePosition, mascotStateFor } from "@/lib/mascot";

const sheet = { frames: 20, fps: 20, cols: 5, rows: 4 };

describe("마스코트 프레임 계산", () => {
  it("반복 재생은 처음으로 돌아가고, 한 번 재생은 마지막 프레임에서 멈춘다", () => {
    expect(frameAt(0, sheet, true)).toBe(0);
    expect(frameAt(999, sheet, true)).toBe(19);
    expect(frameAt(1000, sheet, true)).toBe(0);
    expect(frameAt(1000, sheet, false)).toBe(19);
    expect(frameAt(-50, sheet, true)).toBe(0);
    expect(durationMs(sheet)).toBe(1000);
  });

  it("격자 위치를 background-position(%)으로 바꾼다", () => {
    expect(framePosition(0, sheet)).toBe("0% 0%");
    expect(framePosition(4, sheet)).toBe("100% 0%");
    expect(framePosition(5, sheet)).toBe("0% 33.33333333333333%");
    expect(framePosition(19, sheet)).toBe("100% 100%");
  });

  it("장면·결과에 맞는 동작을 고른다", () => {
    expect(mascotStateFor("thinking")).toBe("walk");
    expect(mascotStateFor("default")).toBe("idle");
    expect(mascotStateFor("happy", "great")).toBe("happy");
    expect(mascotStateFor("star", "careful")).toBe("idle");
  });
});

describe("마스코트 에셋", () => {
  const pub = path.resolve(import.meta.dirname, "../public");
  it.each(Object.keys(MASCOT_SHEETS) as MascotState[])("%s 시트 파일이 있고 격자가 프레임 수를 담는다", (st) => {
    const s = MASCOT_SHEETS[st];
    expect(fs.existsSync(path.join(pub, s.src))).toBe(true);
    expect(s.cols * s.rows).toBeGreaterThanOrEqual(s.frames);
    expect(s.cols * s.rows - s.frames).toBeLessThan(s.cols); // 빈 줄 없음
    // 모바일 메모리: 시트 한 장 400KB 이하
    expect(fs.statSync(path.join(pub, s.src)).size).toBeLessThan(400 * 1024);
  });
  it("포스터가 있다", () => {
    expect(fs.existsSync(path.join(pub, MASCOT_POSTER))).toBe(true);
  });
});
