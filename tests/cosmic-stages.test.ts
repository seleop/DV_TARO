import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { signupJourneyStage } from "@/components/auth/signupJourney";
import { createJourneyCurve } from "@/components/cosmos/journey";
import {
  CameraRig,
  Director,
  INTRO_VALUES,
  STAGE_TARGETS,
  blendedLength,
  cameraGoal,
  createJourneyPaths,
  journeyPoint,
  journeyTangent,
  pathWeights,
  stepDirector,
  type DirectorValues,
} from "@/components/cosmos/stages";
import type { SignupField } from "@/lib/auth/validate";

describe("회원가입 단계 → 우주 유람의 장", () => {
  it("실제 가입 단계(이메일·비밀번호·확인·닉네임·초대 코드·동의·완료)에 맞춰 장이 정해진다", () => {
    const map: Array<[SignupField, string]> = [
      ["email", "enter"],
      ["password", "ignite"],
      ["passwordConfirm", "ignite"],
      ["displayName", "nebula"],
      ["inviteCode", "core"],
      ["agreePrivacy", "core"],
    ];
    for (const [f, stage] of map) expect(signupJourneyStage(f, false)).toBe(stage);
    for (const [f] of map) expect(signupJourneyStage(f, true)).toBe("arrive");
  });
});

describe("연출 값 전환", () => {
  it("목표값으로 부드럽게 다가가고, 프레임 수와 무관하다", () => {
    const a: DirectorValues = { ...STAGE_TARGETS.enter };
    const b: DirectorValues = { ...STAGE_TARGETS.enter };
    for (let i = 0; i < 120; i++) stepDirector(a, STAGE_TARGETS.ignite, 1 / 60);
    for (let i = 0; i < 60; i++) stepDirector(b, STAGE_TARGETS.ignite, 1 / 30);
    for (const k of Object.keys(a) as Array<keyof DirectorValues>) expect(a[k]).toBeCloseTo(b[k], 6);
    // 2초 뒤에는 목표 쪽으로 상당히 와 있지만 한 번에 바뀌지는 않는다
    expect(a.brightness).toBeGreaterThan(STAGE_TARGETS.enter.brightness);
    expect(a.pathB).toBeGreaterThan(0.3);
    expect(a.pathB).toBeLessThan(1);
  });

  it("이전 단계로 돌아가면 같은 방식으로 되돌아간다", () => {
    const v: DirectorValues = { ...STAGE_TARGETS.nebula };
    for (let i = 0; i < 600; i++) stepDirector(v, STAGE_TARGETS.ignite, 1 / 60);
    expect(v.nebula).toBeLessThan(0.02);
    expect(v.gather).toBeLessThan(0.02);
    expect(v.pathB).toBeCloseTo(1, 2);
  });

  it("처음에는 멀고 높은 곳에서 시작해 진입 장의 거리로 다가간다", () => {
    const d = new Director(INTRO_VALUES);
    const start = d.values.followDistance;
    for (let i = 0; i < 300; i++) d.update(STAGE_TARGETS.enter, 1 / 60);
    expect(start).toBeGreaterThan(STAGE_TARGETS.enter.followDistance);
    expect(d.values.followDistance).toBeLessThan(start);
    expect(d.values.followDistance).toBeGreaterThan(STAGE_TARGETS.enter.followDistance);
  });

  it("진행률은 속도에 따라 누적되며 속도가 바뀌어도 이어진다", () => {
    const d = new Director(STAGE_TARGETS.cruise, 0.2);
    d.update(STAGE_TARGETS.cruise, 1);
    const u1 = d.u;
    d.update(STAGE_TARGETS.enter, 1);
    expect(u1).toBeGreaterThan(0.2);
    expect(d.u).toBeGreaterThan(u1);
    expect(d.u - u1).toBeLessThan(u1 - 0.2 + 1e-9);
  });
});

describe("세 갈래 경로 섞기", () => {
  const paths = createJourneyPaths(createJourneyCurve());

  it("비중의 합은 1이고, 안쪽 경로가 커지면 두 번째 경로 비중은 줄어든다", () => {
    for (const [b, c] of [
      [0, 0],
      [1, 0],
      [1, 1],
      [0.5, 0.5],
    ]) {
      const w = pathWeights(b, c);
      expect(w[0] + w[1] + w[2]).toBeCloseTo(1, 9);
      expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
    }
    expect(pathWeights(1, 1)).toEqual([0, 0, 1]);
  });

  it("비중이 조금 바뀌면 위치도 조금만 바뀐다 (경로를 옮길 때 튀지 않음)", () => {
    const p1 = journeyPoint(paths, 0.3, pathWeights(0.5, 0), new Vector3());
    const p2 = journeyPoint(paths, 0.3, pathWeights(0.51, 0), new Vector3());
    expect(p1.distanceTo(p2)).toBeLessThan(1);
    const t = journeyTangent(paths, 0.3, pathWeights(0.5, 0.2), new Vector3());
    expect(t.length()).toBeCloseTo(1, 6);
  });

  it("안쪽 경로는 은하 중심에 더 가깝다", () => {
    let outer = 0;
    let inner = 0;
    for (let i = 0; i < 50; i++) {
      outer += journeyPoint(paths, i / 50, pathWeights(0, 0), new Vector3()).length();
      inner += journeyPoint(paths, i / 50, pathWeights(0, 1), new Vector3()).length();
    }
    expect(inner).toBeLessThan(outer * 0.6);
    expect(blendedLength(paths, pathWeights(0, 1))).toBeLessThan(blendedLength(paths, pathWeights(0, 0)));
  });
});

describe("카메라가 별똥별을 화면 안에 잡는다", () => {
  const paths = createJourneyPaths(createJourneyCurve());
  // 가입 화면 위쪽 무대(세로) 기준: 세로 시야 55°, 가로/세로 비율 약 0.58
  const tanV = Math.tan((55 / 2) * (Math.PI / 180));
  const tanH = tanV * 0.58;

  /** 별똥별이 화면에서 어디에 보이는지 (-1~1: 화면 끝) */
  function screenPos(pos: Vector3, look: Vector3, star: Vector3) {
    const f = look.clone().sub(pos).normalize();
    const right = f.clone().cross(new Vector3(0, 1, 0)).normalize();
    const up = right.clone().cross(f).normalize();
    const rel = star.clone().sub(pos);
    const z = rel.dot(f);
    return { x: rel.dot(right) / z / tanH, y: rel.dot(up) / z / tanV, z };
  }

  for (const stage of ["cruise", "enter", "ignite", "nebula", "core", "arrive"] as const) {
    it(`${stage}: 장이 자리 잡은 뒤 한참 동안 별똥별이 화면 안쪽에 있다`, () => {
      const d = new Director(INTRO_VALUES, 0.08);
      const rig = new CameraRig();
      const gp = new Vector3();
      const gl = new Vector3();
      const dt = 1 / 60;
      let worst = 0;
      for (let i = 0; i < 60 * 70; i++) {
        d.update(STAGE_TARGETS[stage], dt);
        d.locate(paths);
        cameraGoal(d, paths, gp, gl);
        rig.follow(gp, gl, dt);
        if (i > 60 * 15) {
          const p = screenPos(rig.pos, rig.look, d.star);
          expect(p.z).toBeGreaterThan(0);
          worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
        }
      }
      // 화면 가장자리(1)에서 충분히 안쪽
      expect(worst).toBeLessThan(0.7);
    });
  }
});
