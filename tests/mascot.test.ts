import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MASCOT_POSTER, MASCOT_POSTERS, MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { durationMs, frameAt, framePosition, idleReactionFor, introFor, mascotStateFor, nextIdleReactionDelay, outfitFor, resolveSheet, tapReactionFor } from "@/lib/mascot";

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

  it("장면·결과에 맞는 바탕 동작을 고른다", () => {
    expect(mascotStateFor("thinking")).toBe("walk");
    expect(mascotStateFor("default")).toBe("idle");
    expect(mascotStateFor("tarot")).toBe("think");
    expect(mascotStateFor("happy", "great")).toBe("happy");
    expect(mascotStateFor("star", "careful")).toBe("idle");
  });

  it("들어올 때·터치·대기 반응은 모두 한 번 재생 동작이다 (휴식 자세로 끝나 자연스럽게 복귀)", () => {
    expect(introFor("default")).toBe("wave");
    expect(introFor("happy", "great")).toBe("celebrate");
    expect(introFor("happy", "good")).toBe("reveal");
    expect(introFor("thinking")).toBeNull();
    const oneShots = new Set<string>();
    for (let r = 0; r < 1; r += 0.01) {
      oneShots.add(tapReactionFor(1, 5, () => r));
      const idle = idleReactionFor(60_000, () => r);
      if (idle) oneShots.add(idle);
    }
    oneShots.add(introFor("happy", "great")!);
    for (const st of oneShots) expect(MASCOT_SHEETS[st as MascotState].loop, st).toBe(false);
    expect(tapReactionFor(5, 5, () => 0)).toBe("surprised");
  });

  it("장면별 의상을 고르고, 의상에 없는 동작은 가까운 동작으로 바꾼다", () => {
    const names = new Set(Object.keys(MASCOT_SHEETS));
    expect(outfitFor("tarot")).toBe("tarot");
    expect(outfitFor("thinking")).toBe("default");
    expect(resolveSheet("default", "celebrate", names)).toBe("celebrate");
    expect(resolveSheet("saju", "wave", names)).toBe("saju-wave");
    expect(resolveSheet("saju", "reveal", names)).toBe("saju-read");
    expect(resolveSheet("tarot", "celebrate", names)).toBe("tarot-draw");
    expect(resolveSheet("star", "think", names)).toBe("star-idle");
    expect(resolveSheet("star", "yawn", names)).toBe("star-nod");
    // 의상마다 터치·대기 반응이 모두 한 번 재생 동작으로 바뀐다 (바탕 동작으로 돌아올 수 있어야 함)
    for (const o of ["saju", "tarot", "star"] as const) {
      for (const st of ["wave", "nod", "surprised", "reveal", "celebrate", "yawn"]) {
        expect(MASCOT_SHEETS[resolveSheet(o, st, names) as MascotState].loop, `${o}/${st}`).toBe(false);
      }
      expect(MASCOT_POSTERS[o]).toBeTruthy();
    }
  });

  it("오래 두기 전에는 하품하지 않는다", () => {
    for (let r = 0; r < 1; r += 0.01) expect(idleReactionFor(1000, () => r)).not.toBe("yawn");
    expect(nextIdleReactionDelay(() => 0)).toBe(9000);
  });
});

describe("마스코트 에셋", () => {
  const pub = path.resolve(import.meta.dirname, "../public");
  it.each(Object.keys(MASCOT_SHEETS) as MascotState[])("%s 시트 파일이 있고 격자가 프레임 수를 담는다", (st) => {
    const s = MASCOT_SHEETS[st];
    expect(fs.existsSync(path.join(pub, s.src))).toBe(true);
    expect(s.cols * s.rows).toBeGreaterThanOrEqual(s.frames);
    expect(s.cols * s.rows - s.frames).toBeLessThan(s.cols); // 빈 줄 없음
    // 모바일 네트워크·메모리: 시트 한 장 800KB 이하, 한 변 4096px 이하
    expect(fs.statSync(path.join(pub, s.src)).size).toBeLessThan(800 * 1024);
    expect(Math.max(s.cols * s.frameW, s.rows * s.frameH)).toBeLessThanOrEqual(4096);
  });
  it("포스터가 있다", () => {
    expect(fs.existsSync(path.join(pub, MASCOT_POSTER))).toBe(true);
  });
});

describe("화면별 장면", () => {
  it("경로에 맞는 장면을 고른다", async () => {
    const { sceneForPath } = await import("@/lib/scene");
    expect(sceneForPath("/")).toBe("dawn");
    expect(sceneForPath("/today")).toBe("dawn");
    expect(sceneForPath("/saju")).toBe("study");
    expect(sceneForPath("/saju/new")).toBe("plain");
    expect(sceneForPath("/tarot")).toBe("sanctum");
    expect(sceneForPath("/horoscope")).toBe("observatory");
    expect(sceneForPath("/login")).toBe("garden");
    expect(sceneForPath("/me")).toBe("plain");
  });
});
