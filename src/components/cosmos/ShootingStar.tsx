"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, Color, DynamicDrawUsage, Vector3, type CatmullRomCurve3, type Mesh, type ShaderMaterial, type Sprite } from "three";
import { glowCanvas, type JourneyClock } from "./common";
import { mulberry32, progressAt, tailAt, wrap01 } from "./journey";
import { TRAIL_FRAG, TRAIL_VERT } from "./shaders";

/* 매 프레임 새 객체를 만들지 않도록 계산용 벡터를 미리 만들어 둔다 (장면에는 별똥별이 하나뿐이다) */
const P = new Vector3();
const T = new Vector3();
const TO_CAM = new Vector3();
const SIDE = new Vector3();
const HEAD = new Vector3();

const HERO_SAMPLES = 64;

/**
 * 주인공 별똥별: 작은 빛의 핵 + 부드러운 발광 + 길이·밝기가 숨 쉬듯 변하는 꼬리.
 * 닫힌 유람 경로를 등속으로 끝없이 돌기 때문에 반복할 때 처음 위치로 순간이동하지 않는다.
 * 꼬리는 경로상의 지난 위치들로 만든 띠이고, 늘 카메라 쪽을 향하게 펼쳐 어느 각도에서도 두께가 보인다.
 */
export function ShootingStar({ curve, clock }: { curve: CatmullRomCurve3; clock: JourneyClock }) {
  const trail = useRef<Mesh>(null);
  const core = useRef<Sprite>(null);
  const glow = useRef<Sprite>(null);
  const geo = useMemo(() => ribbonBuffers(HERO_SAMPLES), []);
  const length = useMemo(() => curve.getLength(), [curve]);
  const uniforms = useMemo(
    () => ({
      uBrightness: { value: 1 },
      uHead: { value: new Color("#ffffff") },
      uMid: { value: new Color("#e7ddff") },
      uTail: { value: new Color("#5b45d9") },
    }),
    [],
  );
  const coreTex = useMemo(() => glowCanvas(["rgba(255,255,255,1)", "rgba(255,255,255,0.55)", "rgba(240,232,255,0.12)", "rgba(200,180,255,0)"], 64), []);
  const glowTex = useMemo(() => glowCanvas(["rgba(236,226,255,0.55)", "rgba(178,140,255,0.2)", "rgba(110,80,230,0.06)", "rgba(60,40,160,0)"], 128), []);

  useFrame((state) => {
    const mesh = trail.current;
    if (!mesh) return;
    const t = clock.time;
    const u = progressAt(t);
    const { length: tailLen, brightness } = tailAt(t);
    const cam = state.camera.position;
    const pos = (mesh.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;

    for (let i = 0; i < HERO_SAMPLES; i++) {
      const s = i / (HERO_SAMPLES - 1);
      const ui = wrap01(u - (s * tailLen) / length);
      curve.getPointAt(ui, P);
      curve.getTangentAt(ui, T);
      // 꼬리 띠를 카메라 쪽으로 펼친다: 진행 방향 × 카메라를 향하는 방향
      TO_CAM.subVectors(cam, P);
      SIDE.crossVectors(T, TO_CAM).normalize();
      // 머리 쪽이 굵고 끝으로 갈수록 가늘어진다
      const w = 0.11 * Math.pow(1 - s, 0.8) + 0.006;
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

    curve.getPointAt(u, HEAD);
    if (core.current) {
      core.current.position.copy(HEAD);
      core.current.scale.setScalar(0.32 + brightness * 0.08);
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
