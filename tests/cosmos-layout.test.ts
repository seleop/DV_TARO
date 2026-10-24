import { describe, expect, it } from "vitest";
import { constellationPoints, cosmosBudget, mulberry32 } from "@/components/auth/cosmos/layout";

describe("회원가입 3D 우주 배치", () => {
  it("가입 단계 수만큼 별을 놓고, 화면 위쪽·가운데 폭 안에 둔다", () => {
    for (const total of [5, 6]) {
      const pts = constellationPoints(total);
      expect(pts).toHaveLength(total);
      for (const [x, y, z] of pts) {
        expect(Math.abs(x)).toBeLessThanOrEqual(1.8);
        expect(y).toBeGreaterThan(0.9);
        expect(y).toBeLessThan(3);
        expect(Math.abs(z)).toBeLessThan(1);
      }
    }
    expect(constellationPoints(0)).toHaveLength(1);
    expect(constellationPoints(99)).toHaveLength(6);
  });

  it("작은 화면·코어가 적은 기기는 입자를 줄이고, 해상도 배율은 1.5배를 넘지 않는다", () => {
    const lite = cosmosBudget({ width: 375, cores: 8, dpr: 3 });
    const full = cosmosBudget({ width: 1024, cores: 8, dpr: 2 });
    expect(lite.lite).toBe(true);
    expect(lite.stars).toBeLessThan(full.stars);
    expect(lite.galaxy).toBeLessThan(full.galaxy);
    expect(lite.maxDpr).toBe(1.5);
    expect(cosmosBudget({ width: 1024, cores: 4, dpr: 1 }).lite).toBe(true);
    expect(cosmosBudget({ width: 1024, cores: 8, dpr: 1 }).maxDpr).toBe(1);
  });

  it("같은 씨앗값이면 같은 난수(별 배치가 매번 같다)", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});
