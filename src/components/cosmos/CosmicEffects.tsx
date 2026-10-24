"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, NormalBlending, Vector2, Vector3, type Camera, type CatmullRomCurve3, type Mesh, type Points, type ShaderMaterial } from "three";
import { CORE_POINT, type Director } from "./stages";
import { smooth, wrap, type JourneyClock } from "./common";
import { bandPoint, gaussian, mulberry32 } from "./journey";
import { DUST_VERT, NEBULA_FRAG, NEBULA_VERT, STAR_FRAG } from "./shaders";

/** 빛나는 성운 색 짝(바탕 → 빛 받는 가장자리): 레퍼런스의 진한 보라·파랑·자홍 */
const GLOW: Array<[string, string]> = [
  ["#2a12a0", "#c27bff"],
  ["#1426a8", "#6f9bff"],
  ["#4a128f", "#f08cff"],
  ["#1c1b8c", "#9c86ff"],
];
/** 어두운 먼지 구름 색 짝(속 → 가장자리) */
const DARK: Array<[string, string]> = [
  ["#130a3d", "#b48cff"],
  ["#0d1040", "#8aa2ff"],
];

/** 성운 판 하나의 uniform (모든 성운 판이 같은 셰이더를 쓴다) */
export function nebulaUniforms(o: { seed: number; a: string; b: string; opacity: number; dark?: boolean; nearFade?: number }) {
  return {
    uTime: { value: 0 },
    uSeed: { value: o.seed },
    uColorA: { value: new Color(o.a) },
    uColorB: { value: new Color(o.b) },
    uOpacity: { value: o.opacity },
    uLight: { value: new Vector2(0.6, 0.8) },
    uDark: { value: o.dark ? 1 : 0 },
    uNearFade: { value: o.nearFade ?? 22 },
  };
}

const L_RIGHT = new Vector3();
const L_UP = new Vector3();
const L_DIR = new Vector3();

/**
 * 성운 판을 카메라 쪽으로 돌리고, 빛(점 또는 방향)이 판 위 어느 쪽에서 오는지 uLight에 넣는다.
 * 판은 카메라와 같은 회전이라, 판의 가로·세로가 화면의 오른쪽·위쪽과 같다.
 */
export function faceAndLight(m: Mesh, camera: Camera, t: number, light: Vector3, isPoint: boolean) {
  m.quaternion.copy(camera.quaternion);
  const u = (m.material as ShaderMaterial).uniforms;
  u.uTime.value = t;
  L_RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
  L_UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
  if (isPoint) L_DIR.subVectors(light, m.position);
  else L_DIR.copy(light);
  const x = L_DIR.dot(L_RIGHT);
  const y = L_DIR.dot(L_UP);
  const len = Math.hypot(x, y);
  if (len > 1e-4) (u.uLight.value as Vector2).set(x / len, y / len);
}

/**
 * 여러 겹의 성운 (배경 그림을 돌리는 방식이 아니라, 3D 공간 여러 깊이에 놓인 구름 판):
 *  - 경로 둘레(중간 깊이): 빛나는 성운 + 어두운 먼지 구름. 은하 중심 쪽에서 빛을 받아 가장자리가 밝다
 *  - 은하수 띠(먼 곳): 아주 큰 구름이 천천히 흐른다
 *  - 가까이 스치는 구름(NearWisps): 카메라 곁을 빠르게 지나가며 옅게 감싼다
 *  - 닉네임 장의 보라 성운(FocusNebula), 별똥별 주변으로 모이는 별빛 먼지
 * 가까운 것은 빠르게, 먼 것은 느리게 움직여 층마다 시차가 생긴다.
 */
export function CosmicEffects({
  curve,
  clock,
  director,
  nebulae,
  bandClouds,
  wisps,
  dust,
  pixelRatio,
}: {
  curve: CatmullRomCurve3;
  clock: JourneyClock;
  director: Director;
  nebulae: number;
  bandClouds: number;
  wisps: number;
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

  useFrame(({ camera }) => {
    const t = clock.time;
    for (const m of meshes.current) if (m) faceAndLight(m, camera, t, CORE_POINT, true);
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
          scale={[c.size, c.size * c.aspect, 1]}
          frustumCulled={false}
          renderOrder={c.dark ? 1 : 0}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={NEBULA_VERT}
            fragmentShader={NEBULA_FRAG}
            uniforms={c.uniforms}
            transparent
            depthWrite={false}
            blending={c.dark ? NormalBlending : AdditiveBlending}
          />
        </mesh>
      ))}
      <NearWisps clock={clock} count={wisps} />
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

const W_REL = new Vector3();
const WISP_BOX = 90;

/**
 * 가까이 스치는 구름: 카메라를 감싼 상자(한 변 90) 안의 구름 판. 카메라가 지나가면 반대편에서 다시 나타난다.
 * 세계에 고정돼 있어 카메라 곁을 빠르게 흘러가고, 너무 가깝거나 상자 가장자리에 가면 옅어진다.
 * 절반은 카메라 둘레(옅게), 절반은 카메라보다 아래(크고 진하게: 내려다보는 화면 아래쪽을 채우는 구름 바다).
 */
function NearWisps({ clock, count }: { clock: JourneyClock; count: number }) {
  const items = useMemo(() => {
    const rand = mulberry32(5555);
    return Array.from({ length: count * 2 }, (_, i) => {
      const below = i >= count;
      const [a, b] = GLOW[(i + 2) % GLOW.length];
      const opacity = below ? 0.5 + rand() * 0.25 : 0.32 + rand() * 0.2;
      return {
        below,
        base: new Vector3(rand() * WISP_BOX, below ? -8 - rand() * 14 : rand() * WISP_BOX * 0.5, rand() * WISP_BOX),
        size: below ? 45 + rand() * 30 : 22 + rand() * 18,
        opacity,
        uniforms: nebulaUniforms({ seed: rand() * 10, a, b, opacity, nearFade: below ? 14 : 9 }),
      };
    });
  }, [count]);
  const meshes = useRef<Array<Mesh | null>>([]);
  useFrame(({ camera }) => {
    const half = WISP_BOX / 2;
    items.forEach((w, i) => {
      const m = meshes.current[i];
      if (!m) return;
      W_REL.set(
        wrap(w.base.x - camera.position.x + half, WISP_BOX) - half,
        // 아래 구름은 카메라보다 늘 일정하게 아래에 있다
        w.below ? w.base.y : wrap(w.base.y - camera.position.y + half / 2, half) - half / 2,
        wrap(w.base.z - camera.position.z + half, WISP_BOX) - half,
      );
      m.position.copy(camera.position).add(W_REL);
      const fade = smooth(0.32 * WISP_BOX, 0.5 * WISP_BOX, W_REL.length());
      faceAndLight(m, camera, clock.time, CORE_POINT, true);
      (m.material as ShaderMaterial).uniforms.uOpacity.value = w.opacity * (1 - fade);
    });
  });
  return (
    <group>
      {items.map((w, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          scale={[w.size, w.size * 0.6, 1]}
          frustumCulled={false}
          renderOrder={3}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial vertexShader={NEBULA_VERT} fragmentShader={NEBULA_FRAG} uniforms={w.uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

const F_FWD = new Vector3();
const F_RIGHT = new Vector3();

/** 닉네임 장: 카메라 앞 가까이로 다가오는 보라 성운 하나 (평소에는 투명) */
function FocusNebula({ director, clock }: { director: Director; clock: JourneyClock }) {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => nebulaUniforms({ seed: 4.2, a: "#2b1290", b: "#d79cff", opacity: 0 }), []);
  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    const k = director.values.nebula;
    m.visible = k > 0.01;
    if (!m.visible) return;
    // 별똥별 너머, 카메라 앞쪽에 놓고 장이 무르익을수록 가까이 다가온다
    camera.getWorldDirection(F_FWD);
    F_RIGHT.crossVectors(F_FWD, camera.up).normalize();
    const dist = 34 - 16 * k;
    m.position.copy(director.star).addScaledVector(F_FWD, dist).addScaledVector(F_RIGHT, 5).addScaledVector(camera.up, 3);
    m.scale.setScalar(26 + 14 * k);
    // 별똥별이 이 성운을 비춘다
    faceAndLight(m, camera, clock.time, director.star, true);
    (m.material as ShaderMaterial).uniforms.uOpacity.value = 1.05 * k;
  });
  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={0} visible={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={NEBULA_VERT} fragmentShader={NEBULA_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

/**
 * 경로 둘레 성운: 경로를 따라 고르게, 옆·위아래로 비켜 여러 깊이에 놓는다.
 * 셋 중 하나는 어두운 먼지 구름이라 뒤의 빛을 가려 층이 겹쳐 보인다.
 */
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
    const dark = i % 3 === 2;
    const off = (rand() < 0.5 ? -1 : 1) * (12 + rand() * 30);
    const [a, b] = dark ? DARK[i % DARK.length] : GLOW[i % GLOW.length];
    // 절반은 경로보다 아래(카메라가 내려다보는 화면 아래쪽을 채움), 나머지는 옆·위
    const y = i % 2 === 0 ? -9 - rand() * 16 : (rand() - 0.3) * 20;
    return {
      dark,
      position: [p.x + side.x * off, p.y + y, p.z + side.z * off] as [number, number, number],
      size: 60 + rand() * 70,
      aspect: 0.6 + rand() * 0.4,
      uniforms: nebulaUniforms({ seed: rand() * 10, a, b, opacity: dark ? 0.8 + rand() * 0.2 : 0.7 + rand() * 0.35, dark }),
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
    const [a, b] = GLOW[(i + 1) % GLOW.length];
    return {
      dark: false,
      position: [p.x, p.y, p.z] as [number, number, number],
      size: 170 + rand() * 100,
      aspect: 0.55 + rand() * 0.3,
      uniforms: nebulaUniforms({ seed: rand() * 10, a, b, opacity: 0.75 + rand() * 0.25 }),
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
