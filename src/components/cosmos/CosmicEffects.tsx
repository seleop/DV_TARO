"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type CatmullRomCurve3, type Mesh, type Points, type ShaderMaterial, Vector3 } from "three";
import type { Director } from "./stages";
import type { JourneyClock } from "./common";
import { bandPoint, gaussian, mulberry32 } from "./journey";
import { DUST_VERT, NEBULA_FRAG, NEBULA_VERT, STAR_FRAG } from "./shaders";

/** 성운 색 짝: 딥 네이비·미드나이트 블루·바이올렛·은은한 라벤더 */
const PALETTE: Array<[string, string]> = [
  ["#141a5a", "#6a45c8"],
  ["#0f1650", "#9d8ae6"],
  ["#22175f", "#7f58cf"],
  ["#101848", "#6f69c9"],
];

/**
 * 성운 구름(여러 깊이에 놓인, 카메라를 향하는 판) + 유람 경로 주변의 미세한 먼지.
 * 먼지는 카메라 가까이를 빠르게 지나가 이동감·깊이를 만들고, 성운은 멀리서 천천히 움직여 공간의 층을 만든다.
 * 장에 따라: 별빛 입자가 별똥별 주변으로 모이고(gather), 보라 성운 하나가 카메라 앞으로 가까워진다(nebula).
 */
export function CosmicEffects({
  curve,
  clock,
  director,
  nebulae,
  bandClouds,
  dust,
  pixelRatio,
}: {
  curve: CatmullRomCurve3;
  clock: JourneyClock;
  director: Director;
  nebulae: number;
  bandClouds: number;
  dust: number;
  pixelRatio: number;
}) {
  const clouds = useMemo(() => [...placeNebulae(curve, nebulae), ...placeBandClouds(bandClouds)], [curve, nebulae, bandClouds]);
  const meshes = useRef<Array<Mesh | null>>([]);
  const dustRef = useRef<Points>(null);
  const dustData = useMemo(() => buildDust(curve, dust), [curve, dust]);
  const dustUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: 70 }, uTwinkle: { value: 0.25 }, uCenter: { value: new Vector3() }, uGather: { value: 0 } }),
    [pixelRatio],
  );

  useFrame((state) => {
    const t = clock.time;
    const q = state.camera.quaternion;
    for (const m of meshes.current) {
      if (!m) continue;
      // 늘 카메라를 마주 보게 해 판의 모서리가 드러나지 않게 한다 (회전값 복사라 새 객체가 생기지 않음)
      m.quaternion.copy(q);
      (m.material as ShaderMaterial).uniforms.uTime.value = t;
    }
    const dm = dustRef.current?.material as ShaderMaterial | undefined;
    if (dm) {
      dm.uniforms.uTime.value = t;
      (dm.uniforms.uCenter.value as Vector3).copy(director.star);
      dm.uniforms.uGather.value = director.values.gather;
    }
  });

  return (
    <group>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={c.position}
          scale={[c.size, c.size, 1]}
          frustumCulled={false}
          renderOrder={0}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={NEBULA_VERT}
            fragmentShader={NEBULA_FRAG}
            uniforms={c.uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
      <FocusNebula director={director} clock={clock} />
      <points ref={dustRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustData.position, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[dustData.size, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[dustData.phase, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[dustData.color, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={DUST_VERT} fragmentShader={STAR_FRAG} uniforms={dustUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}

const F_FWD = new Vector3();
const F_RIGHT = new Vector3();

/** 닉네임 장: 카메라 앞 가까이로 다가오는 보라 성운 하나 (평소에는 투명) */
function FocusNebula({ director, clock }: { director: Director; clock: JourneyClock }) {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: 4.2 },
      uColorA: { value: new Color("#2b1a7a") },
      uColorB: { value: new Color("#b48cff") },
      uOpacity: { value: 0 },
    }),
    [],
  );
  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    const k = director.values.nebula;
    const mat = m.material as ShaderMaterial;
    mat.uniforms.uTime.value = clock.time;
    mat.uniforms.uOpacity.value = 0.95 * k;
    m.visible = k > 0.01;
    if (!m.visible) return;
    // 별똥별 너머, 카메라 앞쪽에 놓고 장이 무르익을수록 가까이 다가온다
    camera.getWorldDirection(F_FWD);
    F_RIGHT.crossVectors(F_FWD, camera.up).normalize();
    const dist = 34 - 16 * k;
    m.position.copy(director.star).addScaledVector(F_FWD, dist).addScaledVector(F_RIGHT, 5).addScaledVector(camera.up, 3);
    m.quaternion.copy(camera.quaternion);
    m.scale.setScalar(26 + 14 * k);
  });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={0} visible={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={NEBULA_VERT} fragmentShader={NEBULA_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

/** 성운을 경로를 따라 고르게, 옆·위아래로 비켜 여러 깊이에 놓는다 */
function placeNebulae(curve: CatmullRomCurve3, n: number) {
  const rand = mulberry32(404);
  const p = new Vector3();
  const tan = new Vector3();
  const side = new Vector3();
  const up = new Vector3(0, 1, 0);
  return Array.from({ length: n }, (_, i) => {
    const u = (i + rand() * 0.6) / n;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, tan);
    side.crossVectors(tan, up).normalize();
    // 일부는 경로 앞쪽 먼 곳(정면에 보이는 곳), 나머지는 옆·위아래로 비켜 여러 깊이에 놓는다
    const off = (rand() < 0.5 ? -1 : 1) * (10 + rand() * 30);
    const [a, b] = PALETTE[i % PALETTE.length];
    return {
      position: [p.x + side.x * off, p.y + (rand() - 0.35) * 26, p.z + side.z * off] as [number, number, number],
      size: 55 + rand() * 65,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: rand() * 10 },
        uColorA: { value: new Color(a) },
        uColorB: { value: new Color(b) },
        uOpacity: { value: 0.55 + rand() * 0.3 },
      },
    };
  });
}

/** 은하수 띠를 따라 놓인 아주 큰 성운 (멀리 있어 천천히 움직이며 띠에 색과 부피를 준다) */
function placeBandClouds(n: number) {
  const rand = mulberry32(6262);
  const p = new Vector3();
  return Array.from({ length: n }, (_, i) => {
    const angle = ((i + rand() * 0.5) / n) * Math.PI * 2;
    bandPoint(angle, 0.06 + gaussian(rand) * 0.03, 215 + rand() * 30, p);
    const [a, b] = PALETTE[(i + 1) % PALETTE.length];
    return {
      position: [p.x, p.y, p.z] as [number, number, number],
      size: 170 + rand() * 100,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: rand() * 10 },
        uColorA: { value: new Color(a) },
        uColorB: { value: new Color(b) },
        uOpacity: { value: 0.7 + rand() * 0.25 },
      },
    };
  });
}

/** 경로 둘레(반지름 약 9)의 관 안에 흩어진 미세한 먼지 */
function buildDust(curve: CatmullRomCurve3, n: number) {
  const rand = mulberry32(909);
  const position = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const p = new Vector3();
  const lav = new Color("#cfc2ff");
  const blue = new Color("#8fa2ff");
  const c = new Color();
  for (let i = 0; i < n; i++) {
    curve.getPointAt(rand(), p);
    position[i * 3] = p.x + gaussian(rand) * 3.2;
    position[i * 3 + 1] = p.y + gaussian(rand) * 2.4;
    position[i * 3 + 2] = p.z + gaussian(rand) * 3.2;
    size[i] = 0.4 + rand() * 0.8;
    phase[i] = rand();
    c.copy(lav).lerp(blue, rand());
    color.set([c.r * 0.7, c.g * 0.7, c.b * 0.7], i * 3);
  }
  return { position, size, phase, color };
}
