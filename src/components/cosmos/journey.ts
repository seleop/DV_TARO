import { CatmullRomCurve3, Vector3 } from "three";

/**
 * 우주 유람의 경로·시간·추적 계산 (렌더링과 분리한 순수 함수, tests/cosmic-journey.test.ts).
 * 별똥별은 은하 원반을 가로지르는 닫힌 곡선을 따라 끊김 없이 돈다(처음으로 순간이동하지 않음).
 * 모든 움직임은 프레임 수가 아니라 흐른 시간(초)에 비례한다.
 */

/** 은하 원반(반지름 약 70) 안을 굽이치며 지나는 닫힌 경로의 기준점. 높이를 오르내려 원반의 두께·층을 지나간다 */
const PATH: ReadonlyArray<readonly [number, number, number]> = [
  [38, 2.5, 0],
  [30, 5.5, 24],
  [6, 3, 40],
  [-20, -1.5, 34],
  [-40, 1, 14],
  [-36, 4.5, -12],
  [-16, 2, -34],
  [12, -2, -40],
  [34, 0.5, -24],
];

export const JOURNEY = {
  /** 경로 한 바퀴에 걸리는 시간(초). 느리고 유려하게 */
  loopSeconds: 150,
  /** 카메라가 별똥별 뒤에서 따라가는 거리(경로 길이 단위) */
  followDistance: 7.5,
  /** 카메라가 별똥별보다 위에 있는 높이 */
  followHeight: 2.2,
  /** 경로 옆으로 살짝 비켜 보는 거리(정면 일직선이 단조롭지 않게) */
  followSide: 1.4,
  /** 카메라가 바라보는 지점: 별똥별보다 조금 앞 */
  lookAhead: 3,
  /** 위치·시선 추적의 부드러움(클수록 빨리 따라감) */
  positionLambda: 1.6,
  lookLambda: 2.4,
  /** 한 프레임에 반영할 최대 시간(탭 전환 뒤 큰 시간 차로 튀지 않게) */
  maxStep: 0.1,
} as const;

export function createJourneyCurve(): CatmullRomCurve3 {
  const curve = new CatmullRomCurve3(
    PATH.map(([x, y, z]) => new Vector3(x, y, z)),
    true,
    "centripetal",
  );
  // 등속 이동(getPointAt)용 길이 표를 촘촘하게 만든다
  curve.arcLengthDivisions = 600;
  curve.updateArcLengths();
  return curve;
}

/** 흐른 시간 → 경로 위 진행률(0~1, 한 바퀴 돌면 다시 0으로 이어짐) */
export function progressAt(elapsed: number, loopSeconds: number = JOURNEY.loopSeconds): number {
  return wrap01(elapsed / loopSeconds);
}

/** 0~1 범위로 감는다 (음수도 이어지게) */
export function wrap01(u: number): number {
  return u - Math.floor(u);
}

/** 프레임 수와 무관하게 목표에 다가가는 지수 감쇠. 30fps·60fps·120fps에서 같은 속도로 따라간다 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** 별똥별 꼬리 길이(경로 길이 단위)와 밝기: 천천히 숨 쉬듯 변한다 */
export function tailAt(elapsed: number): { length: number; brightness: number } {
  const breathe = Math.sin(elapsed * 0.45) * 0.5 + 0.5;
  const flicker = Math.sin(elapsed * 2.3 + 1.7) * 0.5 + 0.5;
  return { length: 5.5 + breathe * 3.5, brightness: 0.78 + breathe * 0.17 + flicker * 0.05 };
}

/** 기기 성능에 맞춘 입자 수·해상도 배율. 작은 화면·코어가 적은 기기는 가볍게 */
export function cosmicBudget(env: { width: number; cores: number; dpr: number }) {
  const lite = env.width < 600 || env.cores <= 4;
  return {
    lite,
    galaxyStars: lite ? 9000 : 18000,
    farStars: lite ? 3500 : 5000,
    bandStars: lite ? 9000 : 16000,
    bandClouds: lite ? 6 : 8,
    dust: lite ? 700 : 1400,
    nebulae: lite ? 9 : 13,
    heroStars: lite ? 5000 : 9000,
    skyNebulae: lite ? 8 : 12,
    flares: lite ? 26 : 45,
    asteroids: lite ? 70 : 130,
    /** 시차 별층: 가까운 별·중간 별·빛 알갱이 */
    nearStars: lite ? 450 : 800,
    midStars: lite ? 1400 : 2600,
    bokeh: lite ? 26 : 44,
    /** 가까이 스치는 구름·파편, 혜성 수 */
    wisps: lite ? 4 : 6,
    debris: lite ? 36 : 60,
    comets: lite ? 1 : 2,
    streaks: lite ? 80 : 130,
    /** 앞에서 날아오는 빛 알갱이·스쳐 가는 작은 혜성 (비행하는 속도감) */
    oncoming: lite ? 150 : 240,
    flybys: lite ? 3 : 4,
    sparkleCapacity: lite ? 380 : 600,
    sparkleRate: lite ? 220 : 340,
    maxDpr: Math.min(env.dpr, lite ? 1.5 : 2),
  };
}

/**
 * 하늘을 크게 가로지르는 은하수 띠: 먼 거리(반지름 약 200)의 기울어진 큰 원.
 * 카메라가 경로 어디에 있든 띠가 보여 '은하 안에 있다'는 느낌을 준다.
 */
// 카메라는 경로를 따라 거의 수평으로 둘러보므로, 띠를 지평선 가까이 두고 살짝만 기울여
// 어느 방향을 보든 화면 위쪽을 비스듬히 가로지르게 한다 (세로 화면은 가로 시야가 좁다)
const BAND_NORMAL = new Vector3(0.16, 1, 0.1).normalize();
const BAND_U = new Vector3().crossVectors(BAND_NORMAL, new Vector3(0, 0, 1)).normalize();
const BAND_V = new Vector3().crossVectors(BAND_NORMAL, BAND_U).normalize();

/** 띠 위의 한 점: angle(띠를 따라 도는 각), offset(띠 폭 방향, 라디안), radius → out */
export function bandPoint(angle: number, offset: number, radius: number, out: Vector3): Vector3 {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const co = Math.cos(offset);
  return out
    .copy(BAND_U)
    .multiplyScalar(ca * co * radius)
    .addScaledVector(BAND_V, sa * co * radius)
    .addScaledVector(BAND_NORMAL, Math.sin(offset) * radius);
}

/** 씨앗값이 같으면 항상 같은 배치가 나오는 난수 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 대략 정규분포(-3~3) 난수: 은하 원반 두께·성운 흩뿌림용 */
export function gaussian(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) * 1.5;
}
