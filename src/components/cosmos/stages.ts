import { CatmullRomCurve3, Vector3 } from "three";
import { JOURNEY, damp, wrap01 } from "./journey";

/**
 * 우주 유람의 장(場)별 연출 (렌더링과 분리한 순수 계산, tests/cosmic-stages.test.ts).
 * 장면은 장 이름만 받고, 연출 값(속도·카메라 거리·경로 비중·밝기 등)이 그 장의 목표값으로 시간에 따라 부드럽게 따라간다.
 * 그래서 장이 바뀌어도 배경이 갑자기 바뀌지 않고, 이전 장으로 돌아가면 같은 방식으로 되돌아간다.
 *
 *  - cruise : 기본 유람 (미리보기 등 장이 정해지지 않았을 때)
 *  - enter  : 은하수 안으로 천천히 진입. 카메라가 멀고 높은 곳에서 다가오고, 별똥별이 앞서 나아간다
 *  - ignite : 별똥별이 밝아지고 꼬리가 길어지며, 은하수의 다른 곡선 경로로 옮겨 간다
 *  - nebula : 보라색 성운이 가까워지고 별빛 입자가 별똥별 주변으로 모인다
 *  - core   : 은하 중심부를 향해 나아간다 (밝기는 과하지 않게)
 *  - arrive : 별똥별이 은하 중심의 빛으로 들어가고, 화면은 바깥에서 부드럽게 사라진다
 */
export type JourneyStage = "cruise" | "enter" | "ignite" | "nebula" | "core" | "arrive";

export type DirectorValues = {
  /** 경로를 도는 속도 배율 */
  speed: number;
  /** 카메라가 별똥별 뒤에서 따라가는 거리 */
  followDistance: number;
  /** 카메라가 별똥별보다 위에 있는 높이 */
  followHeight: number;
  /** 두 번째 곡선 경로의 비중 (0~1) */
  pathB: number;
  /** 은하 중심 쪽 안쪽 경로의 비중 (0~1) */
  inward: number;
  /** 시선이 은하 중심을 향하는 정도 (0~1) */
  coreLook: number;
  /** 별똥별 밝기 배율 */
  brightness: number;
  /** 꼬리 길이 배율 */
  tail: number;
  /** 가까이 다가오는 보라 성운 (0~1) */
  nebula: number;
  /** 별빛 입자가 별똥별 주변으로 모이는 정도 (0~1) */
  gather: number;
  /** 별똥별이 은하 중심의 빛으로 들어가는 정도 (0~1) */
  finale: number;
};

const BASE: DirectorValues = {
  speed: 1,
  followDistance: JOURNEY.followDistance,
  followHeight: JOURNEY.followHeight,
  pathB: 0,
  inward: 0,
  coreLook: 0,
  brightness: 1,
  tail: 1,
  nebula: 0,
  gather: 0,
  finale: 0,
};

export const STAGE_TARGETS: Record<JourneyStage, DirectorValues> = {
  cruise: BASE,
  enter: { ...BASE, speed: 0.55, followDistance: 12, followHeight: 3.8, brightness: 0.9, tail: 0.85 },
  ignite: { ...BASE, speed: 0.95, followDistance: 8, followHeight: 2.3, pathB: 1, brightness: 1.3, tail: 1.6 },
  nebula: { ...BASE, speed: 0.75, followDistance: 6.8, followHeight: 1.9, pathB: 1, brightness: 1.15, tail: 1.3, nebula: 1, gather: 1 },
  core: { ...BASE, speed: 0.7, followDistance: 7.5, followHeight: 2.4, pathB: 0.5, inward: 1, coreLook: 1, brightness: 1.05, tail: 1.2 },
  arrive: { ...BASE, speed: 0.9, followDistance: 10, followHeight: 3.2, pathB: 0.5, inward: 1, coreLook: 1, brightness: 1.15, tail: 1.1, finale: 1 },
};

/** 처음 나타날 때의 값: 은하 바깥 멀고 높은 곳 (여기서 첫 장의 목표값으로 다가오며 '진입'이 된다) */
export const INTRO_VALUES: DirectorValues = { ...STAGE_TARGETS.enter, followDistance: 26, followHeight: 11 };

/** 값마다 따라가는 빠르기 (클수록 빨리). 마지막 장의 빛으로 들어가는 움직임은 화면이 사라지기 전에 보이도록 빠르게 */
const LAMBDA: Record<keyof DirectorValues, number> = {
  speed: 0.8,
  followDistance: 0.7,
  followHeight: 0.7,
  pathB: 0.45,
  inward: 0.45,
  coreLook: 0.8,
  brightness: 1.2,
  tail: 1,
  nebula: 0.9,
  gather: 0.8,
  finale: 2.2,
};

const KEYS = Object.keys(LAMBDA) as Array<keyof DirectorValues>;

/** 현재값을 목표값 쪽으로 dt초만큼 옮긴다 (프레임 수와 무관) */
export function stepDirector(cur: DirectorValues, target: DirectorValues, dt: number): void {
  for (const k of KEYS) cur[k] = damp(cur[k], target[k], LAMBDA[k], dt);
}

/**
 * 장면 공용 연출 상태: 연출 값과 경로 위 진행률(u).
 * 한 컴포넌트(JourneyDirector)만 매 프레임 update()로 앞으로 보내고, 나머지는 읽기만 한다.
 * 속도가 바뀌어도 진행률은 누적되므로 별똥별 위치가 튀지 않는다.
 */
export class Director {
  values: DirectorValues;
  u: number;
  /** 이번 프레임의 경로 비중·섞인 경로 길이 */
  weights: [number, number, number] = [1, 0, 0];
  length = 1;
  /** 경로 위 별똥별 위치(path)와, 마지막 장에서 은하 중심으로 끌려간 실제 위치(star) */
  path = new Vector3();
  star = new Vector3();
  tangent = new Vector3(1, 0, 0);
  constructor(start: DirectorValues, u = 0) {
    this.values = { ...start };
    this.u = u;
  }
  update(target: DirectorValues, dt: number) {
    stepDirector(this.values, target, dt);
    this.u = wrap01(this.u + (dt * this.values.speed) / JOURNEY.loopSeconds);
  }
  /** 움직임 없이 목표값으로 바로 맞춘다 ('동작 줄이기' 설정의 정지 장면) */
  snap(target: DirectorValues) {
    Object.assign(this.values, target);
  }
  /** 현재 진행률·비중으로 별똥별 위치·방향을 계산해 둔다 (매 프레임 한 번, 새 객체 없음) */
  locate(paths: JourneyPaths) {
    const w = pathWeights(this.values.pathB, this.values.inward);
    this.weights[0] = w[0];
    this.weights[1] = w[1];
    this.weights[2] = w[2];
    this.length = blendedLength(paths, this.weights);
    journeyPoint(paths, this.u, this.weights, this.path);
    journeyTangent(paths, this.u, this.weights, this.tangent);
    this.star.copy(this.path).lerp(CORE_POINT, this.values.finale);
  }
}

/** 유람 경로 세 갈래: 기본(A), 은하수의 다른 곡선(B), 은하 중심 쪽 안쪽(C) */
export type JourneyPaths = { a: CatmullRomCurve3; b: CatmullRomCurve3; c: CatmullRomCurve3; lengths: [number, number, number] };

const PATH_B: ReadonlyArray<readonly [number, number, number]> = [
  [44, -1, -8],
  [34, 3.5, 22],
  [12, 6.5, 44],
  [-16, 2, 46],
  [-42, -2.5, 24],
  [-46, 1.5, -6],
  [-28, 5, -34],
  [2, 2.5, -48],
  [30, -1.5, -36],
];

/** 은하 중심 쪽 안쪽 경로 (너무 급하게 휘면 카메라가 별똥별을 놓쳐 반지름을 약 22로 둔다) */
const PATH_C: ReadonlyArray<readonly [number, number, number]> = [
  [22.1, 1.6, 0],
  [15.6, 3, 14.3],
  [1.3, 2.2, 22.1],
  [-13, 0.6, 18.2],
  [-22.1, 1.2, 5.2],
  [-19.5, 2.6, -9.1],
  [-7.8, 1.6, -19.5],
  [7.8, 0.5, -22.1],
  [19.5, 0.9, -13],
];

function closedCurve(points: ReadonlyArray<readonly [number, number, number]>) {
  const c = new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    true,
    "centripetal",
  );
  c.arcLengthDivisions = 600;
  c.updateArcLengths();
  return c;
}

export function createJourneyPaths(a: CatmullRomCurve3): JourneyPaths {
  const b = closedCurve(PATH_B);
  const c = closedCurve(PATH_C);
  return { a, b, c, lengths: [a.getLength(), b.getLength(), c.getLength()] };
}

/** 세 경로의 비중: B는 안쪽 경로가 커질수록 줄어든다. 합은 항상 1 */
export function pathWeights(pathB: number, inward: number): [number, number, number] {
  const wc = clamp01(inward);
  const wb = clamp01(pathB) * (1 - wc);
  return [1 - wb - wc, wb, wc];
}

const TMP_B = new Vector3();
const TMP_C = new Vector3();

/** 진행률 u에서의 위치(세 경로를 비중대로 섞음) → out */
export function journeyPoint(paths: JourneyPaths, u: number, w: [number, number, number], out: Vector3): Vector3 {
  paths.a.getPointAt(u, out).multiplyScalar(w[0]);
  if (w[1] > 1e-4) out.addScaledVector(paths.b.getPointAt(u, TMP_B), w[1]);
  if (w[2] > 1e-4) out.addScaledVector(paths.c.getPointAt(u, TMP_C), w[2]);
  return out;
}

/** 진행률 u에서의 진행 방향(세 경로 방향을 비중대로 섞어 정규화) → out */
export function journeyTangent(paths: JourneyPaths, u: number, w: [number, number, number], out: Vector3): Vector3 {
  paths.a.getTangentAt(u, out).multiplyScalar(w[0]);
  if (w[1] > 1e-4) out.addScaledVector(paths.b.getTangentAt(u, TMP_B), w[1]);
  if (w[2] > 1e-4) out.addScaledVector(paths.c.getTangentAt(u, TMP_C), w[2]);
  return out.lengthSq() > 1e-8 ? out.normalize() : out.set(1, 0, 0);
}

/** 섞인 경로의 대략적인 길이 (꼬리 길이·카메라 거리를 진행률로 바꿀 때 쓴다) */
export function blendedLength(paths: JourneyPaths, w: [number, number, number]): number {
  return paths.lengths[0] * w[0] + paths.lengths[1] * w[1] + paths.lengths[2] * w[2];
}

/** 은하 중심의 빛: 마지막 장에서 별똥별이 들어가는 곳 */
export const CORE_POINT = new Vector3(0, 1.2, 0);

const C_UP = new Vector3(0, 1, 0);
const C_TAN = new Vector3();
const C_SIDE = new Vector3();

/**
 * 카메라가 가려는 자리(pos)와 바라볼 곳(look)을 계산한다 (3인칭: 별똥별 뒤·위·옆).
 *  - 마지막 장: 별똥별이 중심으로 끌려가는 만큼 카메라도 뒤에서 따라 들어가고, 별똥별 자체를 바라본다
 *  - 안쪽 경로는 급하게 휘어 '앞쪽 점'이 화면 옆으로 벗어나므로, 안쪽일수록 시선을 별똥별에 모은다
 *  - 중심부 장은 안쪽 경로 자체가 중심으로 다가가고, 시선은 중심 쪽으로 아주 살짝만 돌린다 (세로 화면은 가로 시야가 좁다)
 */
export function cameraGoal(d: Director, paths: JourneyPaths, pos: Vector3, look: Vector3) {
  const v = d.values;
  const back = wrap01(d.u - v.followDistance / d.length);
  journeyPoint(paths, back, d.weights, pos);
  journeyTangent(paths, back, d.weights, C_TAN);
  C_SIDE.crossVectors(C_TAN, C_UP).normalize();
  pos.addScaledVector(C_UP, v.followHeight).addScaledVector(C_SIDE, JOURNEY.followSide);
  pos.x += (d.star.x - d.path.x) * 0.7;
  pos.y += (d.star.y - d.path.y) * 0.7;
  pos.z += (d.star.z - d.path.z) * 0.7;

  journeyPoint(paths, wrap01(d.u + JOURNEY.lookAhead / d.length), d.weights, look);
  look.lerp(d.star, Math.max(0.35, 0.75 * v.inward));
  // 중심까지 거리가 멀어(20 이상) 조금만 돌려도 좁은 가로 시야에서 별똥별이 밀려나므로 아주 살짝만
  look.lerp(CORE_POINT, v.coreLook * 0.025 * (1 - v.finale));
  look.lerp(d.star, v.finale);
}

/** 카메라의 실제 자리·시선: 목표를 지수 감쇠로 부드럽게 따라간다 (급한 회전 없음) */
export class CameraRig {
  pos = new Vector3();
  look = new Vector3();
  ready = false;
  /** dt=0(정지 장면)이거나 처음이면 목표로 바로 맞춘다 */
  follow(goalPos: Vector3, goalLook: Vector3, dt: number) {
    if (!this.ready || dt === 0) {
      this.pos.copy(goalPos);
      this.look.copy(goalLook);
      this.ready = true;
      return;
    }
    const kp = 1 - Math.exp(-JOURNEY.positionLambda * dt);
    const kl = 1 - Math.exp(-JOURNEY.lookLambda * dt);
    this.pos.lerp(goalPos, kp);
    this.look.lerp(goalLook, kl);
  }
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
