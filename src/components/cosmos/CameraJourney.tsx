"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Vector3, type PerspectiveCamera } from "three";
import type { JourneyClock } from "./common";
import { JOURNEY } from "./journey";
import { CameraRig, STAGE_TARGETS, cameraGoal, type Director, type JourneyPaths, type JourneyStage } from "./stages";

/* 매 프레임 새 객체를 만들지 않도록 계산용 벡터를 미리 만들어 둔다 */
const UP = new Vector3(0, 1, 0);
const GOAL_POS = new Vector3();
const GOAL_LOOK = new Vector3();

/**
 * 장면 시계: 매 프레임 흐른 시간을 앞으로 보낸다(다른 컴포넌트보다 먼저 놓는다).
 * moving=false(동작 줄이기)이면 시간을 멈춰 장면이 정지 화면이 된다.
 */
export function JourneyTimer({ clock, moving }: { clock: JourneyClock; moving: boolean }) {
  useFrame((_, delta) => {
    const step = moving ? Math.min(delta, JOURNEY.maxStep) : 0;
    // 탭이 숨겨졌다 돌아와도 큰 시간 차로 튀지 않게 한 프레임 최대치를 둔다
    clock.advance(step);
  });
  return null;
}

/**
 * 연출 감독: 지금 장(stage)의 목표값으로 연출 값을 부드럽게 옮기고, 별똥별 위치를 계산해 둔다.
 * 장은 바깥(회원가입 단계 등)에서 이름만 받는다. UI 상태와 카메라 계산은 여기서 분리된다.
 */
export function JourneyDirector({
  director,
  paths,
  stage,
  beat,
  clock,
  moving,
}: {
  director: Director;
  paths: JourneyPaths;
  stage: JourneyStage;
  beat?: number;
  clock: JourneyClock;
  moving: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const lastBeat = useRef(beat);
  // 정지 장면(필요할 때만 그림)에서는 장이 바뀔 때 한 장 다시 그리게 한다
  useEffect(() => invalidate(), [stage, beat, invalidate]);
  // 단계를 마치거나 되돌아갈 때마다: 워프 → 다음 구도로 휘돌아 들어가고 하늘 색조가 바뀐다
  // (단계 화면에 처음 들어올 때는 워프 없이 부드럽게, 동작 줄이기면 바로 맞춤)
  useEffect(() => {
    if (beat === undefined) {
      if (lastBeat.current !== undefined) director.release();
      lastBeat.current = undefined;
      return;
    }
    const first = lastBeat.current === undefined || lastBeat.current === beat;
    lastBeat.current = beat;
    if (!moving) director.snapKick(beat);
    else if (first) director.aim(beat);
    else director.kick(beat);
  }, [beat, moving, director]);
  useFrame(() => {
    if (moving) director.update(STAGE_TARGETS[stage], clock.dt);
    else director.snap(STAGE_TARGETS[stage]);
    director.locate(paths);
  });
  return null;
}

/**
 * 3인칭 카메라: 별똥별보다 조금 뒤·위·옆에서 따라가며, 별똥별 약간 앞을 바라본다.
 * 위치·시선 모두 지수 감쇠(damp)로 부드럽게 따라가 급격한 회전이 없고, 위쪽 방향을 고정해 화면이 기울지 않는다.
 * 장에 따라 따라가는 거리·높이, 은하 중심을 바라보는 정도, 별똥별 둘레를 도는 각도·화면 기울기·시야각이 바뀐다.
 * 장이 바뀌는 순간에는 가속하며 시야가 넓어지고 카메라가 다음 자리로 휘돌아 들어간다(Director.surge).
 */
export function CameraJourney({ director, paths, clock }: { director: Director; paths: JourneyPaths; clock: JourneyClock }) {
  const [rig] = useState(() => new CameraRig());
  useFrame(({ camera }) => {
    cameraGoal(director, paths, GOAL_POS, GOAL_LOOK);
    rig.follow(GOAL_POS, GOAL_LOOK, clock.dt, director.star);
    camera.position.copy(rig.pos);
    camera.up.copy(UP);
    camera.lookAt(rig.look);
    // 시선 축으로 살짝 기울인다 (위쪽 방향 벡터는 그대로라 다른 계산에 영향 없음)
    camera.rotateZ(director.rollAngle());
    const cam = camera as PerspectiveCamera;
    const fov = director.fov();
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}
