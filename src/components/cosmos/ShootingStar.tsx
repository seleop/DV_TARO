"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, Color, DynamicDrawUsage, Vector3, type Mesh, type Points, type ShaderMaterial, type Sprite, type SpriteMaterial } from "three";
import { flareCanvas, glowCanvas, type JourneyClock } from "./common";
import { mulberry32, tailAt, wrap01 } from "./journey";
import { CORE_POINT, journeyPoint, journeyTangent, type Director, type JourneyPaths } from "./stages";
import { SPARKLE_FRAG, SPARKLE_VERT, TRAIL_FRAG, TRAIL_VERT } from "./shaders";

/* 매 프레임 새 객체를 만들지 않도록 계산용 벡터를 미리 만들어 둔다 (장면에는 별똥별이 하나뿐이다) */
const P = new Vector3();
const T = new Vector3();
const TO_CAM = new Vector3();
const SIDE = new Vector3();
const HEAD = new Vector3();

const HERO_SAMPLES = 64;

/**
 * 주인공 별똥별: 작은 빛의 핵 + 부드러운 발광 + 길이·밝기가 숨 쉬듯 변하는 꼬리.
 * 닫힌 유람 경로를 끝없이 돌기 때문에 반복할 때 처음 위치로 순간이동하지 않는다.
 * 꼬리는 경로상의 지난 위치들로 만든 띠이고, 늘 카메라 쪽을 향하게 펼쳐 어느 각도에서도 두께가 보인다.
 * 장에 따라 밝기·꼬리 길이가 바뀌고, 마지막 장에서는 머리부터 은하 중심의 빛으로 끌려 들어간다.
 */
export function ShootingStar({ director, paths, clock }: { director: Director; paths: JourneyPaths; clock: JourneyClock }) {
  const trail = useRef<Mesh>(null);
  const core = useRef<Sprite>(null);
  const glow = useRef<Sprite>(null);
  const geo = useMemo(() => ribbonBuffers(HERO_SAMPLES), []);
  const uniforms = useMemo(
    () => ({
      uBrightness: { value: 1 },
      uHead: { value: new Color("#ffffff") },
      uMid: { value: new Color("#e2d6ff") },
      uTail: { value: new Color("#4f5ef0") },
    }),
    [],
  );
  // 머리: 별 모양(십자 빛) 핵 — 레퍼런스처럼 반짝이는 별
  const coreTex = useMemo(() => flareCanvas(128), []);
  const glowTex = useMemo(() => glowCanvas(["rgba(236,226,255,0.55)", "rgba(178,140,255,0.2)", "rgba(110,80,230,0.06)", "rgba(60,40,160,0)"], 128), []);

  useFrame((state) => {
    const mesh = trail.current;
    if (!mesh) return;
    const t = clock.time;
    const v = director.values;
    const u = director.u;
    const breath = tailAt(t);
    const tailLen = breath.length * v.tail;
    const brightness = breath.brightness * v.brightness;
    const w0 = director.weights;
    const cam = state.camera.position;
    const pos = (mesh.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;

    for (let i = 0; i < HERO_SAMPLES; i++) {
      const s = i / (HERO_SAMPLES - 1);
      const ui = wrap01(u - (s * tailLen) / director.length);
      journeyPoint(paths, ui, w0, P);
      journeyTangent(paths, ui, w0, T);
      // 마지막 장: 머리 쪽일수록 은하 중심으로 더 끌려가 꼬리가 그 뒤를 잇는다
      if (v.finale > 1e-3) P.lerp(CORE_POINT, v.finale * Math.pow(1 - s, 0.6));
      // 꼬리 띠를 카메라 쪽으로 펼친다: 진행 방향 × 카메라를 향하는 방향
      TO_CAM.subVectors(cam, P);
      SIDE.crossVectors(T, TO_CAM).normalize();
      // 머리 쪽이 굵고 끝으로 갈수록 가늘어진다
      const w = 0.2 * Math.pow(1 - s, 0.7) + 0.01;
      const k = i * 6;
      pos[k] = P.x + SIDE.x * w;
      pos[k + 1] = P.y + SIDE.y * w;
      pos[k + 2] = P.z + SIDE.z * w;
      pos[k + 3] = P.x - SIDE.x * w;
      pos[k + 4] = P.y - SIDE.y * w;
      pos[k + 5] = P.z - SIDE.z * w;
    }
    mesh.geometry.getAttribute("position").needsUpdate = true;
    (mesh.material as ShaderMaterial).uniforms.uBrightness.value = brightness;

    HEAD.copy(director.star);
    if (core.current) {
      core.current.position.copy(HEAD);
      core.current.scale.setScalar(0.9 + brightness * 0.25);
      // 별 모양 머리가 천천히 돈다
      (core.current.material as SpriteMaterial).rotation = t * 0.6;
    }
    if (glow.current) {
      glow.current.position.copy(HEAD);
      const pulse = 2.3 + Math.sin(t * 1.3) * 0.25;
      glow.current.scale.setScalar(pulse * brightness);
    }
  });

  return (
    <group>
      <mesh ref={trail} frustumCulled={false} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geo.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aAlong" args={[geo.along, 1]} />
          <bufferAttribute attach="attributes-aAcross" args={[geo.across, 1]} />
          <bufferAttribute attach="index" args={[geo.index, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={TRAIL_VERT} fragmentShader={TRAIL_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <sprite ref={glow} renderOrder={3}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[glowTex]} />
        </spriteMaterial>
      </sprite>
      <sprite ref={core} renderOrder={4}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[coreTex]} />
        </spriteMaterial>
      </sprite>
    </group>
  );
}

/* ── 반짝이 입자 꼬리 ─────────────────────────────── */

const SP_BACK = new Vector3();
const SP_SIDE = new Vector3();
const SP_UP = new Vector3();
const SP_WORLD_UP = new Vector3(0, 1, 0);

/**
 * 별똥별 머리에서 흩날려 뒤로 퍼지는 반짝이 입자 (레퍼런스의 반짝이는 꼬리).
 * 미리 만든 버퍼를 고리처럼 돌려 쓰며(매 프레임 새 객체 없음), 수명이 다하면 크기 0으로 숨는다.
 */
export function SparkleTrail({ director, clock, capacity, rate, pixelRatio }: { director: Director; clock: JourneyClock; capacity: number; rate: number; pixelRatio: number }) {
  const ref = useRef<Points>(null);
  const buf = useMemo(
    () => ({
      position: new Float32Array(capacity * 3),
      life: new Float32Array(capacity),
      seed: Float32Array.from({ length: capacity }, (_, i) => ((i * 0.61803) % 1) + 0.0001),
    }),
    [capacity],
  );
  const uniforms = useMemo(() => ({ uPixelRatio: { value: pixelRatio }, uTime: { value: 0 } }), [pixelRatio]);
  // 입자마다의 속도·수명은 그리기 버퍼가 아니라 이 컴포넌트의 상태에 둔다
  const st = useRef({ next: 0, carry: 0, rand: mulberry32(77), velocity: new Float32Array(capacity * 3), maxLife: new Float32Array(capacity) });

  useFrame(() => {
    const p = ref.current;
    if (!p) return;
    const dt = clock.dt;
    const s = st.current;
    const v = director.values;
    const lifeAttr = p.geometry.getAttribute("aLife") as BufferAttribute;
    const posAttr = p.geometry.getAttribute("position") as BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const life = lifeAttr.array as Float32Array;
    // 진행 방향 반대(뒤)와 옆·위 방향
    SP_BACK.copy(director.tangent).multiplyScalar(-1);
    SP_SIDE.crossVectors(director.tangent, SP_WORLD_UP).normalize();
    SP_UP.crossVectors(SP_SIDE, director.tangent).normalize();
    // 새 입자: 밝기·꼬리 길이가 클수록 많이
    s.carry += dt * rate * (0.6 + 0.4 * v.brightness * v.tail);
    while (s.carry >= 1) {
      s.carry -= 1;
      const i = s.next;
      s.next = (s.next + 1) % capacity;
      const k = i * 3;
      const back = 0.6 + s.rand() * 2.6;
      const spread = 0.35 + s.rand() * 0.9;
      const a = s.rand() * Math.PI * 2;
      pos[k] = director.star.x;
      pos[k + 1] = director.star.y;
      pos[k + 2] = director.star.z;
      s.velocity[k] = SP_BACK.x * back + (SP_SIDE.x * Math.cos(a) + SP_UP.x * Math.sin(a)) * spread;
      s.velocity[k + 1] = SP_BACK.y * back + (SP_SIDE.y * Math.cos(a) + SP_UP.y * Math.sin(a)) * spread;
      s.velocity[k + 2] = SP_BACK.z * back + (SP_SIDE.z * Math.cos(a) + SP_UP.z * Math.sin(a)) * spread;
      s.maxLife[i] = 0.7 + s.rand() * 1.1;
      life[i] = 1;
    }
    for (let i = 0; i < capacity; i++) {
      if (life[i] <= 0) continue;
      const k = i * 3;
      pos[k] += s.velocity[k] * dt;
      pos[k + 1] += s.velocity[k + 1] * dt;
      pos[k + 2] += s.velocity[k + 2] * dt;
      life[i] = Math.max(0, life[i] - dt / s.maxLife[i]);
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    (p.material as ShaderMaterial).uniforms.uTime.value = clock.time;
  });

  return (
    <points ref={ref} frustumCulled={false} renderOrder={3}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buf.position, 3]} usage={DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aLife" args={[buf.life, 1]} usage={DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aSeed" args={[buf.seed, 1]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={SPARKLE_VERT} fragmentShader={SPARKLE_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

/* ── 보조 별똥별 ───────────────────────────────────── */

const S_ORIGIN = new Vector3();
const S_P = new Vector3();
const S_TO_CAM = new Vector3();
const S_SIDE = new Vector3();
const S_FWD = new Vector3();
const S_RIGHT = new Vector3();
const S_UP = new Vector3();
const STREAK_SAMPLES = 14;

/**
 * 보조 별똥별: 가끔(7~14초마다) 카메라 앞 먼 곳을 짧게 가로지른다. 산만하지 않게 장면에 2개까지만 둔다.
 * 각 인스턴스는 자기 상태(ref)만 바꾸고, 계산용 벡터는 매 프레임 순서대로 재사용한다.
 */
export function MinorShootingStar({ seed, clock }: { seed: number; clock: JourneyClock }) {
  const mesh = useRef<Mesh>(null);
  const geo = useMemo(() => ribbonBuffers(STREAK_SAMPLES), []);
  const uniforms = useMemo(
    () => ({
      uBrightness: { value: 0 },
      uHead: { value: new Color("#ffffff") },
      uMid: { value: new Color("#d9ceff") },
      uTail: { value: new Color("#6d55e6") },
    }),
    [],
  );
  const s = useRef({ rand: mulberry32(seed), start: -100, next: 4 + (seed % 5), origin: new Vector3(), dir: new Vector3(), length: 2.5 });

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const st = s.current;
    const t = clock.time;
    const mat = m.material as ShaderMaterial;
    const cam = state.camera;
    if (t >= st.next) {
      // 카메라 앞 30~50 거리, 시야 안쪽 위편에서 비스듬히 아래로 지나가게 정한다
      cam.getWorldDirection(S_FWD);
      S_RIGHT.crossVectors(S_FWD, cam.up).normalize();
      S_UP.crossVectors(S_RIGHT, S_FWD).normalize();
      const dist = 30 + st.rand() * 20;
      st.origin
        .copy(cam.position)
        .addScaledVector(S_FWD, dist)
        .addScaledVector(S_RIGHT, (st.rand() - 0.5) * dist * 0.9)
        .addScaledVector(S_UP, dist * (0.15 + st.rand() * 0.25));
      const side = st.rand() < 0.5 ? -1 : 1;
      st.dir
        .copy(S_RIGHT)
        .multiplyScalar(side)
        .addScaledVector(S_UP, -0.45)
        .addScaledVector(S_FWD, (st.rand() - 0.5) * 0.4)
        .normalize()
        .multiplyScalar(14 + st.rand() * 6);
      st.length = 2 + st.rand() * 1.5;
      st.start = t;
      st.next = t + 7 + st.rand() * 7;
    }
    const k = (t - st.start) / 1.1;
    if (k < 0 || k > 1) {
      mat.uniforms.uBrightness.value = 0;
      return;
    }
    mat.uniforms.uBrightness.value = Math.sin(k * Math.PI) * 0.7;
    S_ORIGIN.copy(st.origin).addScaledVector(st.dir, k * 1.1);
    const pos = (m.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;
    const back = st.length / st.dir.length();
    for (let i = 0; i < STREAK_SAMPLES; i++) {
      const f = i / (STREAK_SAMPLES - 1);
      S_P.copy(S_ORIGIN).addScaledVector(st.dir, -f * back);
      S_TO_CAM.subVectors(cam.position, S_P);
      S_SIDE.crossVectors(st.dir, S_TO_CAM).normalize();
      const w = 0.09 * (1 - f) + 0.005;
      const j = i * 6;
      pos[j] = S_P.x + S_SIDE.x * w;
      pos[j + 1] = S_P.y + S_SIDE.y * w;
      pos[j + 2] = S_P.z + S_SIDE.z * w;
      pos[j + 3] = S_P.x - S_SIDE.x * w;
      pos[j + 4] = S_P.y - S_SIDE.y * w;
      pos[j + 5] = S_P.z - S_SIDE.z * w;
    }
    m.geometry.getAttribute("position").needsUpdate = true;
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.position, 3]} usage={DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aAlong" args={[geo.along, 1]} />
        <bufferAttribute attach="attributes-aAcross" args={[geo.across, 1]} />
        <bufferAttribute attach="index" args={[geo.index, 1]} />
      </bufferGeometry>
      <shaderMaterial vertexShader={TRAIL_VERT} fragmentShader={TRAIL_FRAG} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

/** 띠(꼬리) 버퍼: 샘플마다 양옆 두 점, 이웃 샘플끼리 사각형(삼각형 2개)으로 잇는다 */
function ribbonBuffers(samples: number) {
  const position = new Float32Array(samples * 2 * 3);
  const along = new Float32Array(samples * 2);
  const across = new Float32Array(samples * 2);
  const index = new Uint16Array((samples - 1) * 6);
  for (let i = 0; i < samples; i++) {
    const s = i / (samples - 1);
    along[i * 2] = along[i * 2 + 1] = s;
    across[i * 2] = 1;
    across[i * 2 + 1] = -1;
  }
  for (let i = 0; i < samples - 1; i++) {
    const a = i * 2;
    index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  return { position, along, across, index };
}
