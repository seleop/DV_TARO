import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { JOURNEY, bandPoint, cosmicBudget, createJourneyCurve, damp, mulberry32, progressAt, tailAt, wrap01 } from "@/components/cosmos/journey";

describe("우주 유람 경로", () => {
  const curve = createJourneyCurve();

  it("닫힌 곡선이라 한 바퀴 끝과 시작이 이어진다 (처음으로 순간이동하지 않음)", () => {
    const a = curve.getPointAt(0);
    const b = curve.getPointAt(0.99999);
    expect(a.distanceTo(b)).toBeLessThan(0.05);
    // 등속: 같은 시간 간격이면 이동 거리가 거의 같다
    const len = curve.getLength();
    const step = (u: number) => curve.getPointAt(u).distanceTo(curve.getPointAt(u + 0.01));
    for (const u of [0.05, 0.3, 0.55, 0.8]) expect(step(u)).toBeCloseTo(len * 0.01, 0);
  });

  it("경로가 은하 원반 안에 있고 높이가 오르내린다", () => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 200; i++) {
      const p = curve.getPointAt(i / 200);
      expect(Math.hypot(p.x, p.z)).toBeLessThan(60);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    expect(maxY - minY).toBeGreaterThan(4);
  });

  it("진행률은 시간에 비례하고 한 바퀴 뒤 이어진다", () => {
    expect(progressAt(0)).toBe(0);
    expect(progressAt(JOURNEY.loopSeconds / 2)).toBeCloseTo(0.5);
    expect(progressAt(JOURNEY.loopSeconds * 1.25)).toBeCloseTo(0.25);
    expect(wrap01(-0.1)).toBeCloseTo(0.9);
  });

  it("카메라 위치(뒤쪽·위쪽)를 계산하면 별똥별과 일정 거리를 유지한다", () => {
    const len = curve.getLength();
    for (const u of [0.1, 0.4, 0.7]) {
      const star = curve.getPointAt(u);
      const back = curve.getPointAt(wrap01(u - JOURNEY.followDistance / len));
      const cam = back.clone().add(new Vector3(0, JOURNEY.followHeight, 0));
      const d = cam.distanceTo(star);
      expect(d).toBeGreaterThan(JOURNEY.followDistance * 0.6);
      expect(d).toBeLessThan(JOURNEY.followDistance + JOURNEY.followHeight + 1);
      expect(cam.y).toBeGreaterThan(back.y);
    }
  });
});

describe("은하수 띠", () => {
  it("띠 위의 점은 주어진 반지름에 있고, 폭 방향 오프셋이 0이면 한 평면(큰 원) 위에 있다", () => {
    const a = bandPoint(0, 0, 200, new Vector3());
    const b = bandPoint(Math.PI / 2, 0, 200, new Vector3());
    const c = bandPoint(1.3, 0, 200, new Vector3());
    for (const v of [a, b, c]) expect(v.length()).toBeCloseTo(200, 6);
    const normal = new Vector3().crossVectors(a, b).normalize();
    expect(Math.abs(normal.dot(c))).toBeLessThan(1e-6);
    expect(bandPoint(0.4, 0.1, 230, new Vector3()).length()).toBeCloseTo(230, 6);
  });
});

describe("시간 기반 움직임", () => {
  it("damp는 프레임 수와 무관하다 (60fps 두 번 = 30fps 한 번)", () => {
    const a = damp(damp(0, 10, 2, 1 / 60), 10, 2, 1 / 60);
    const b = damp(0, 10, 2, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
    expect(damp(3, 3, 5, 0.016)).toBe(3);
  });

  it("꼬리 길이·밝기는 정해진 범위 안에서 천천히 변한다", () => {
    for (let t = 0; t < 30; t += 0.37) {
      const { length, brightness } = tailAt(t);
      expect(length).toBeGreaterThanOrEqual(5.5);
      expect(length).toBeLessThanOrEqual(9);
      expect(brightness).toBeGreaterThan(0.75);
      expect(brightness).toBeLessThanOrEqual(1);
    }
  });
});

describe("기기별 예산", () => {
  it("작은 화면·저사양은 입자를 줄이고 해상도 배율을 제한한다", () => {
    const lite = cosmicBudget({ width: 390, cores: 8, dpr: 3 });
    const full = cosmicBudget({ width: 1280, cores: 8, dpr: 3 });
    expect(lite.lite).toBe(true);
    expect(lite.galaxyStars).toBeLessThan(full.galaxyStars);
    expect(lite.maxDpr).toBe(1.5);
    expect(full.maxDpr).toBe(2);
    expect(cosmicBudget({ width: 1280, cores: 4, dpr: 1 }).lite).toBe(true);
  });

  it("같은 씨앗값이면 같은 배치", () => {
    const a = mulberry32(3);
    const b = mulberry32(3);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
