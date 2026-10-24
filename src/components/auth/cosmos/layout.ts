/**
 * 회원가입 3D 우주의 배치·성능 예산 (렌더링과 분리한 순수 함수, tests/cosmos-layout.test.ts).
 */

/** 2D 별자리(Constellation.tsx, 300×180 좌표)와 같은 모양을 3D 좌표로 옮긴 것 */
const SHAPE: ReadonlyArray<readonly [number, number]> = [
  [36, 150],
  [92, 104],
  [148, 128],
  [196, 70],
  [254, 96],
  [272, 32],
];

/** 가입 단계 수만큼의 별 위치 [x, y, z]. 화면 위쪽(말풍선·별이와 겹치지 않는 곳)에 놓이고, 깊이를 조금씩 달리해 입체감을 준다 */
export function constellationPoints(total: number): Array<[number, number, number]> {
  const n = Math.max(1, Math.min(total, SHAPE.length));
  return SHAPE.slice(0, n).map(([px, py], i) => [round((px / 300 - 0.5) * 3.6), round(2.9 - (py / 180) * 2.1), i % 2 === 0 ? -0.4 : 0.45]);
}

/** 기기 성능에 맞춘 입자 수·해상도 배율. 작은 화면·코어가 적은 기기는 가볍게 */
export function cosmosBudget(env: { width: number; cores: number; dpr: number } = currentEnv()) {
  const lite = env.width < 500 || env.cores <= 4;
  return {
    lite,
    stars: lite ? 900 : 1600,
    galaxy: lite ? 1800 : 3200,
    maxDpr: Math.min(env.dpr, 1.5),
  };
}

function currentEnv() {
  if (typeof window === "undefined") return { width: 375, cores: 4, dpr: 1 };
  return { width: window.innerWidth, cores: navigator.hardwareConcurrency || 4, dpr: window.devicePixelRatio || 1 };
}

/** 씨앗값이 같으면 항상 같은 별 배치가 나오는 난수 */
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

const round = (n: number) => Math.round(n * 1000) / 1000;
