"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Object3D, type Points, type ShaderMaterial } from "three";
import type { JourneyClock } from "./common";
import { mulberry32 } from "./journey";
import { BOKEH_FRAG, PARALLAX_VERT, STAR_FRAG } from "./shaders";

type Layer = { box: number; near: number; scale: number; maxSize: number; twinkle: number; sizes: [number, number]; tints: string[]; frag: string };

/**
 * 시차 별층 (레퍼런스의 깊이감): 카메라를 감싸는 세 겹.
 *  - 가까운 별: 작은 상자(한 변 34)라 카메라 곁을 빠르게 스쳐 간다
 *  - 중간 별: 큰 상자(한 변 120)라 천천히 흐른다
 *  - 빛 알갱이(보케): 카메라 아주 가까이 떠다니는 흐릿한 라벤더·분홍 원
 * 가장 먼 층(하늘의 은하·성운·먼 별 껍질)은 거의 움직이지 않아, 층마다 속도가 달라 보인다.
 * 위치 계산은 셰이더에서 하므로 매 프레임 CPU 일은 시간 uniform 하나뿐이다.
 */
export function ParallaxStars({ clock, near, mid, bokeh, pixelRatio }: { clock: JourneyClock; near: number; mid: number; bokeh: number; pixelRatio: number }) {
  const layers = useMemo(
    () => [
      { n: near, seed: 101, spec: { box: 34, near: 1.2, scale: 26, maxSize: 7, twinkle: 0.35, sizes: [0.5, 1.6], tints: ["#ffffff", "#e6ddff", "#cdd6ff", "#ffe2f6"], frag: STAR_FRAG } as Layer },
      { n: mid, seed: 202, spec: { box: 120, near: 3, scale: 60, maxSize: 5, twinkle: 0.5, sizes: [0.5, 1.4], tints: ["#f2eeff", "#c9b8ff", "#9fb0ff", "#e9c4ff"], frag: STAR_FRAG } as Layer },
      { n: bokeh, seed: 303, spec: { box: 26, near: 1.5, scale: 30, maxSize: 46, twinkle: 0.2, sizes: [1.2, 3.2], tints: ["#b9a2ff", "#8fa0ff", "#e6a6ff"], frag: BOKEH_FRAG } as Layer },
    ].map(({ n, seed, spec }) => ({ spec, data: buildLayer(n, seed, spec), uniforms: layerUniforms(spec, pixelRatio) })),
    [near, mid, bokeh, pixelRatio],
  );
  const refs = useRef<Array<Object3D | null>>([]);
  useFrame(() => {
    for (const p of refs.current) {
      const m = (p as Points | null)?.material as ShaderMaterial | undefined;
      if (m) m.uniforms.uTime.value = clock.time;
    }
  });
  return (
    <group>
      {layers.map((l, i) => (
        <points
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          frustumCulled={false}
          renderOrder={2}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.data.position, 3]} />
            <bufferAttribute attach="attributes-aSize" args={[l.data.size, 1]} />
            <bufferAttribute attach="attributes-aPhase" args={[l.data.phase, 1]} />
            <bufferAttribute attach="attributes-aColor" args={[l.data.color, 3]} />
          </bufferGeometry>
          <shaderMaterial vertexShader={PARALLAX_VERT} fragmentShader={l.spec.frag} uniforms={l.uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
        </points>
      ))}
    </group>
  );
}

function layerUniforms(s: Layer, pixelRatio: number) {
  return {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uScale: { value: s.scale },
    uTwinkle: { value: s.twinkle },
    uBox: { value: s.box },
    uNear: { value: s.near },
    uMaxSize: { value: s.maxSize },
  };
}

/** 상자 [0, box)³ 안에 고르게 흩뿌린 별 */
function buildLayer(n: number, seed: number, s: Layer) {
  const rand = mulberry32(seed);
  const position = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const tints = s.tints.map((t) => new Color(t));
  for (let i = 0; i < n; i++) {
    position[i * 3] = rand() * s.box;
    position[i * 3 + 1] = rand() * s.box;
    position[i * 3 + 2] = rand() * s.box;
    // 대부분은 작고, 가끔 큰 별
    size[i] = s.sizes[0] + Math.pow(rand(), 3) * (s.sizes[1] - s.sizes[0]);
    phase[i] = rand();
    const c = tints[Math.floor(rand() * tints.length)];
    color.set([c.r, c.g, c.b], i * 3);
  }
  return { position, size, phase, color };
}
