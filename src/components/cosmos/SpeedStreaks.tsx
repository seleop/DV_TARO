"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, Color, DynamicDrawUsage, type Group, type LineSegments, type ShaderMaterial } from "three";
import type { JourneyClock } from "./common";
import { mulberry32 } from "./journey";
import type { Director } from "./stages";

const STREAK_VERT = /* glsl */ `
  attribute float aAlong;
  attribute vec3 aColor;
  varying float vAlong;
  varying vec3 vColor;
  void main() {
    vAlong = aAlong;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STREAK_FRAG = /* glsl */ `
  varying float vAlong;
  varying vec3 vColor;
  uniform float uIntensity;
  void main() {
    // 앞(카메라 쪽) 끝이 밝고 희며, 뒤로 갈수록 제 색으로 옅어진다
    float a = (1.0 - vAlong) * uIntensity;
    vec3 col = mix(vec3(1.0), vColor, smoothstep(0.0, 0.5, vAlong));
    gl_FragColor = vec4(col * a, a);
  }
`;

const NEAR = -1.5;
const FAR = -70;

/**
 * 속도감 빛줄기: 카메라에 붙은 공간에서 앞쪽 멀리서 생겨 화면 가장자리 쪽으로 스쳐 지나간다 (레퍼런스의 빛줄기).
 * 화면 가운데(별똥별 자리)는 비워 두고, 장의 속도가 빠를수록 길고 진해진다. 버퍼는 미리 만들어 재사용한다.
 */
export function SpeedStreaks({ director, clock, count }: { director: Director; clock: JourneyClock; count: number }) {
  const group = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);
  const geo = useMemo(() => {
    const position = new Float32Array(count * 2 * 3);
    const along = new Float32Array(count * 2);
    const color = new Float32Array(count * 2 * 3);
    // 빛줄기 색: 대부분 라벤더·푸른빛, 가끔 청록·분홍·금빛
    const tints = ["#9fa8ff", "#c9b4ff", "#9fa8ff", "#7fe8ff", "#ff9ad6", "#ffd98a"].map((c) => new Color(c));
    const rand = mulberry32(1357);
    for (let i = 0; i < count; i++) {
      along[i * 2 + 1] = 1;
      const c = tints[Math.floor(rand() * tints.length)];
      color.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    return { position, along, color };
  }, [count]);
  const uniforms = useMemo(() => ({ uIntensity: { value: 0 } }), []);
  const st = useRef({ rand: mulberry32(2468), streaks: [] as Array<{ x: number; y: number; z: number; v: number; len: number }> });

  useFrame(({ camera }) => {
    const g = group.current;
    const l = lines.current;
    if (!g || !l) return;
    // 카메라와 같은 자리·방향에 붙인다
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const s = st.current;
    const v = director.values;
    const dt = clock.dt;
    // 장 전환 가속(surge) 때 빛줄기가 길고 진해진다
    const pace = Math.max(0, director.pace() - 0.4) * (0.7 + 0.3 * v.tail);
    if (s.streaks.length === 0) {
      for (let i = 0; i < count; i++) s.streaks.push(spawn(s.rand, FAR + s.rand() * (NEAR - FAR)));
    }
    const pos = (l.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      const k = s.streaks[i];
      k.z += k.v * (0.4 + pace + director.warp * 1.8) * dt;
      if (k.z > NEAR) Object.assign(k, spawn(s.rand, FAR));
      // 빠를수록·전환 가속 때 길게 늘어난다
      // 단계 완료 워프 때 별빛이 길게 늘어난다
      const len = k.len * (0.5 + pace * 1.6 + director.surge * 1.2 + director.warp * 4);
      const j = i * 6;
      pos[j] = k.x;
      pos[j + 1] = k.y;
      pos[j + 2] = k.z;
      pos[j + 3] = k.x;
      pos[j + 4] = k.y;
      pos[j + 5] = k.z - len;
    }
    l.geometry.getAttribute("position").needsUpdate = true;
    (l.material as ShaderMaterial).uniforms.uIntensity.value = Math.min(1, 0.3 + pace * 0.7 + director.surge * 0.3 + director.warp * 0.6) * (1 - v.finale * 0.6);
  });

  return (
    <group ref={group}>
      <lineSegments ref={lines} frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geo.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aAlong" args={[geo.along, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[geo.color, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={STREAK_VERT} fragmentShader={STREAK_FRAG} uniforms={uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

/** 새 빛줄기: 화면 가운데를 비워 둔 고리 모양 영역에서 */
function spawn(rand: () => number, z: number) {
  const a = rand() * Math.PI * 2;
  const r = 3.5 + rand() * 12;
  return { x: Math.cos(a) * r * 0.75, y: Math.sin(a) * r, z, v: 30 + rand() * 25, len: 2.5 + rand() * 6 };
}
