"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type CatmullRomCurve3 } from "three";
import type { JourneyClock } from "./common";
import { JOURNEY, damp, progressAt, wrap01 } from "./journey";

/* 매 프레임 새 객체를 만들지 않도록 계산용 벡터를 미리 만들어 둔다 */
const UP = new Vector3(0, 1, 0);
const TARGET = new Vector3();
const TANGENT = new Vector3();
const SIDE = new Vector3();
const AHEAD = new Vector3();

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
 * 3인칭 카메라: 별똥별보다 조금 뒤·위·옆에서 따라가며, 별똥별 약간 앞을 바라본다.
 * 위치·시선 모두 지수 감쇠(damp)로 부드럽게 따라가 급격한 회전이 없고, 위쪽 방향을 고정해 화면이 기울지 않는다.
 */
export function CameraJourney({ curve, clock }: { curve: CatmullRomCurve3; clock: JourneyClock }) {
  const length = useMemo(() => curve.getLength(), [curve]);
  const look = useRef({ ready: false, x: 0, y: 0, z: 0 });

  useFrame(({ camera }) => {
    const { time, dt } = clock;
    const u = progressAt(time);
    const back = wrap01(u - JOURNEY.followDistance / length);

    // 뒤따르는 자리: 경로상 뒤쪽 + 위로 + 옆으로 조금
    curve.getPointAt(back, TARGET);
    curve.getTangentAt(back, TANGENT);
    SIDE.crossVectors(TANGENT, UP).normalize();
    TARGET.addScaledVector(UP, JOURNEY.followHeight).addScaledVector(SIDE, JOURNEY.followSide);
    // 바라보는 곳: 별똥별보다 조금 앞 (곡선을 돌 때 미리 고개를 돌린다)
    curve.getPointAt(wrap01(u + JOURNEY.lookAhead / length), AHEAD);

    const l = look.current;
    if (!l.ready) {
      camera.position.copy(TARGET);
      l.x = AHEAD.x;
      l.y = AHEAD.y;
      l.z = AHEAD.z;
      l.ready = true;
    } else {
      camera.position.set(
        damp(camera.position.x, TARGET.x, JOURNEY.positionLambda, dt),
        damp(camera.position.y, TARGET.y, JOURNEY.positionLambda, dt),
        damp(camera.position.z, TARGET.z, JOURNEY.positionLambda, dt),
      );
      l.x = damp(l.x, AHEAD.x, JOURNEY.lookLambda, dt);
      l.y = damp(l.y, AHEAD.y, JOURNEY.lookLambda, dt);
      l.z = damp(l.z, AHEAD.z, JOURNEY.lookLambda, dt);
    }
    camera.up.copy(UP);
    camera.lookAt(l.x, l.y, l.z);
  });
  return null;
}
