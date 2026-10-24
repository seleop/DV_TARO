import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { authJourneyStage, signupJourneyStage } from "@/components/auth/signupJourney";
import { entryScreen } from "@/lib/auth/returning-device";
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

describe("진입 화면 (최초 접속·가입 이후)", () => {
  it("이 기기에서 가입·로그인한 적 없으면 터치해 가입을 시작하는 첫 화면, 있으면 버튼 화면", () => {
    expect(entryScreen(false, "open")).toBe("intro");
    expect(entryScreen(false, "invite")).toBe("intro");
    expect(entryScreen(true, "open")).toBe("choose");
    // 가입을 받지 않으면 첫 화면 없이 버튼 화면(로그인)
    expect(entryScreen(false, "closed")).toBe("choose");
  });

  it("인증 화면마다 우주 유람의 장이 정해진다", () => {
    expect(authJourneyStage("pending", "email", false)).toBe("intro");
    expect(authJourneyStage("intro", "email", false)).toBe("intro");
    expect(authJourneyStage("choose", "email", false)).toBe("cruise");
    expect(authJourneyStage("login", "email", false)).toBe("enter");
    expect(authJourneyStage("login", "password", false)).toBe("ignite");
    expect(authJourneyStage("signup", "displayName", false)).toBe("nebula");
    expect(authJourneyStage("signup", "agreePrivacy", true)).toBe("arrive");
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

describe("장 전환의 역동성", () => {
  it("장이 바뀌면 가속이 생겼다가 몇 초 안에 잦아들고, 같은 장에서는 생기지 않는다", () => {
    const d = new Director(STAGE_TARGETS.enter);
    for (let i = 0; i < 120; i++) d.update(STAGE_TARGETS.enter, 1 / 60);
    expect(d.surge).toBe(0);
    d.update(STAGE_TARGETS.ignite, 1 / 60);
    expect(d.surge).toBeGreaterThan(0.7);
    expect(d.pace()).toBeGreaterThan(d.values.speed * 1.5);
    for (let i = 0; i < 60 * 5; i++) d.update(STAGE_TARGETS.ignite, 1 / 60);
    expect(d.surge).toBeLessThan(0.01);
  });

  it("단계가 넘어갈수록 더 역동적이다 (속도·선회·가속 세기)", () => {
    const order = ["enter", "ignite", "nebula", "core"] as const;
    for (let i = 1; i < order.length; i++) expect(STAGE_TARGETS[order[i]].energy).toBeGreaterThan(STAGE_TARGETS[order[i - 1]].energy);
    expect(Math.abs(STAGE_TARGETS.ignite.orbit)).toBeGreaterThan(Math.abs(STAGE_TARGETS.enter.orbit));
    expect(STAGE_TARGETS.core.speed).toBeGreaterThan(STAGE_TARGETS.enter.speed);
    const surgeOf = (from: "enter" | "nebula", to: "ignite" | "core") => {
      const d = new Director(STAGE_TARGETS[from]);
      d.update(STAGE_TARGETS[from], 1 / 60);
      d.update(STAGE_TARGETS[to], 1 / 60);
      return d.surge;
    };
    expect(surgeOf("nebula", "core")).toBeGreaterThan(surgeOf("enter", "ignite"));
  });

  it("뒤로 가면 카메라는 반대쪽으로 휘돈다", () => {
    const d = new Director(STAGE_TARGETS.nebula);
    for (let i = 0; i < 600; i++) d.update(STAGE_TARGETS.nebula, 1 / 60);
    d.update(STAGE_TARGETS.ignite, 1 / 60);
    expect(d.swingDir).toBe(-1);
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
  // 가입 화면 위쪽 무대(세로) 기준: 세로 시야는 장의 시야각, 가로/세로 비율 약 0.58

  /** 별똥별이 화면에서 어디에 보이는지 (-1~1: 화면 끝) */
  function screenPos(pos: Vector3, look: Vector3, star: Vector3, fov: number) {
    const tanV = Math.tan((fov / 2) * (Math.PI / 180));
    const tanH = tanV * 0.58;
    const f = look.clone().sub(pos).normalize();
    const right = f.clone().cross(new Vector3(0, 1, 0)).normalize();
    const up = right.clone().cross(f).normalize();
    const rel = star.clone().sub(pos);
    const z = rel.dot(f);
    return { x: rel.dot(right) / z / tanH, y: rel.dot(up) / z / tanV, z };
  }

  it("단계를 빠르게 넘기고 되돌려도(전환 가속 중에도) 별똥별이 화면 밖으로 나가지 않는다", () => {
    const seq = ["enter", "ignite", "ignite", "nebula", "ignite", "nebula", "core", "core", "nebula", "core"] as const;
    const d = new Director(INTRO_VALUES, 0.08);
    const rig = new CameraRig();
    const gp = new Vector3();
    const gl = new Vector3();
    const dt = 1 / 60;
    let worst = 0;
    seq.forEach((stage, k) => {
      for (let i = 0; i < 60 * 5; i++) {
        d.update(STAGE_TARGETS[stage], dt);
        d.locate(paths);
        cameraGoal(d, paths, gp, gl);
        rig.follow(gp, gl, dt, d.star);
        if (k > 0) {
          const sp = screenPos(rig.pos, rig.look, d.star, d.fov());
          worst = Math.max(worst, Math.abs(sp.x), Math.abs(sp.y));
        }
      }
    });
    expect(worst).toBeLessThan(0.75);
  });

  for (const stage of ["intro", "cruise", "enter", "ignite", "nebula", "core", "arrive"] as const) {
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
        rig.follow(gp, gl, dt, d.star);
        if (i > 60 * 15) {
          const p = screenPos(rig.pos, rig.look, d.star, d.fov());
          expect(p.z).toBeGreaterThan(0);
          worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
        }
      }
      // 화면 가장자리(1)에서 충분히 안쪽
      expect(worst).toBeLessThan(0.7);
    });
  }
});
