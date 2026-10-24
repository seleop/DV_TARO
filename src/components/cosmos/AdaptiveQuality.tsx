"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

/**
 * 해상도 자동 조절: 1.5초마다 평균 fps를 보고, 버벅이면(45 미만) 그리는 해상도(dpr)를 조금씩 낮추고
 * 넉넉하면(57 이상) 다시 올린다. 성운처럼 화면을 넓게 덮는 효과가 많아 기기마다 부담이 달라서다.
 * 해상도를 최저(min)로 낮춰도 두 번 연속 30fps 미만이면 onLow를 한 번 불러 대체 모드(발광·파티클 줄임)로 바꾼다.
 * 정지 장면(동작 줄이기)에서는 프레임이 거의 없어 판단하지 않는다.
 */
export function AdaptiveQuality({ min, max, onLow }: { min: number; max: number; onLow?: () => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ frames: 0, time: 0, dpr: max, slow: 0, lowered: false });
  useFrame((_, delta) => {
    const s = st.current;
    // 탭 전환 등으로 생긴 큰 공백은 세지 않는다
    if (delta > 0.25) return;
    s.frames += 1;
    s.time += delta;
    if (s.time < 1.5) return;
    const fps = s.frames / s.time;
    s.frames = 0;
    s.time = 0;
    // 최저 해상도에서도 많이 버벅이면 대체 모드로 (한 번만)
    if (s.dpr <= min + 0.01 && fps < 30) s.slow += 1;
    else s.slow = 0;
    if (s.slow >= 2 && !s.lowered) {
      s.lowered = true;
      onLow?.();
    }
    let next = s.dpr;
    if (fps < 45) next = Math.max(min, s.dpr * 0.85);
    else if (fps >= 57) next = Math.min(max, s.dpr + 0.1);
    if (Math.abs(next - s.dpr) > 0.01) {
      s.dpr = next;
      setDpr(next);
    }
  });
  return null;
}
