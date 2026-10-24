"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, Color, DynamicDrawUsage, Vector3, type Group, type Mesh, type ShaderMaterial, type Sprite, type SpriteMaterial } from "three";
import { flareCanvas, glowCanvas, smooth, type JourneyClock } from "./common";
import { mulberry32 } from "./journey";
import { ribbonBuffers } from "./ShootingStar";
import { TRAIL_FRAG, TRAIL_VERT } from "./shaders";
import { CORE_POINT } from "./stages";

const SAMPLES = 22;

const C_FWD = new Vector3();
const C_RIGHT = new Vector3();
const C_UP = new Vector3();
const C_HEAD = new Vector3();
const C_ANTI = new Vector3();
const C_ION = new Vector3();
const C_P = new Vector3();
const C_TAN = new Vector3();
const C_TO_CAM = new Vector3();
const C_SIDE = new Vector3();
const C_CURL = new Vector3();

/**
 * 혜성: 가끔(14~24초마다) 멀리(70~100) 하늘을 천천히(10~14초) 가로지른다.
 * 둥근 머리(코마) + 넓게 휘어지는 먼지 꼬리(분홍·라벤더) + 곧게 뻗는 이온 꼬리(파랑). 꼬리는 은하 중심 반대쪽으로 뻗는다.
 * 별똥별(주인공)보다 훨씬 느리고 멀어, 장면에 또 하나의 깊이를 더한다. 매 프레임 새 객체를 만들지 않는다.
 */
export function Comet({ seed, clock }: { seed: number; clock: JourneyClock }) {
  const group = useRef<Group>(null);
  const dust = useRef<Mesh>(null);
  const ion = useRef<Mesh>(null);
  const coma = useRef<Sprite>(null);
  const flare = useRef<Sprite>(null);
  const dustGeo = useMemo(() => ribbonBuffers(SAMPLES), []);
  const ionGeo = useMemo(() => ribbonBuffers(SAMPLES), []);
  const dustUniforms = useMemo(() => ({ uBrightness: { value: 0 }, uHead: { value: new Color("#fff6ff") }, uMid: { value: new Color("#f0b8ff") }, uTail: { value: new Color("#6a4ff0") } }), []);
  const ionUniforms = useMemo(() => ({ uBrightness: { value: 0 }, uHead: { value: new Color("#e8f4ff") }, uMid: { value: new Color("#8cc4ff") }, uTail: { value: new Color("#2f56ff") } }), []);
  const comaTex = useMemo(() => glowCanvas(["rgba(255,255,255,1)", "rgba(230,215,255,0.6)", "rgba(170,140,255,0.15)", "rgba(120,90,255,0)"], 64), []);
  const flareTex = useMemo(() => flareCanvas(64), []);
  const s = useRef({ rand: mulberry32(seed), start: -100, duration: 12, next: 3 + (seed % 7), origin: new Vector3(), vel: new Vector3(), size: 1, length: 10 });

  useFrame((state) => {
    const g = group.current;
    if (!g || !dust.current || !ion.current) return;
    const st = s.current;
    const t = clock.time;
    const cam = state.camera;
    if (t >= st.next) {
      // 카메라 앞 70~100 거리, 화면 위쪽 한편에서 반대편으로 천천히 가로지르게 정한다
      cam.getWorldDirection(C_FWD);
      C_RIGHT.crossVectors(C_FWD, cam.up).normalize();
      C_UP.crossVectors(C_RIGHT, C_FWD).normalize();
      const dist = 70 + st.rand() * 30;
      const side = st.rand() < 0.5 ? -1 : 1;
      st.duration = 10 + st.rand() * 4;
      st.origin
        .copy(cam.position)
        .addScaledVector(C_FWD, dist)
        .addScaledVector(C_RIGHT, side * dist * 0.32)
        .addScaledVector(C_UP, dist * (0.08 + st.rand() * 0.18));
      st.vel
        .copy(C_RIGHT)
        .multiplyScalar(-side)
        .addScaledVector(C_UP, -0.18)
        .addScaledVector(C_FWD, (st.rand() - 0.5) * 0.3)
        .normalize()
        .multiplyScalar((dist * 0.5) / st.duration);
      st.size = 0.8 + st.rand() * 0.6;
      st.length = 9 + st.rand() * 6;
      st.start = t;
      st.next = t + st.duration + 14 + st.rand() * 10;
    }
    const age = t - st.start;
    const env = smooth(0, 1.5, age) * (1 - smooth(st.duration - 2, st.duration, age));
    g.visible = age >= 0 && age <= st.duration && env > 0.001;
    if (!g.visible) return;

    C_HEAD.copy(st.origin).addScaledVector(st.vel, age);
    // 먼지 꼬리: 지나온 쪽 + 은하 중심 반대쪽, 끝으로 갈수록 휘어진다. 이온 꼬리: 은하 중심 반대쪽으로 곧게
    C_ION.subVectors(C_HEAD, CORE_POINT).normalize();
    C_ANTI.copy(st.vel).normalize().multiplyScalar(-0.75).addScaledVector(C_ION, 0.35).normalize();
    C_TO_CAM.subVectors(cam.position, C_HEAD);
    C_CURL.crossVectors(C_ANTI, C_TO_CAM).normalize();
    C_ION.multiplyScalar(0.6).addScaledVector(C_ANTI, 0.4).normalize();

    writeRibbon(dust.current, cam.position, (f, out) => out.copy(C_HEAD).addScaledVector(C_ANTI, f * st.length).addScaledVector(C_CURL, f * f * st.length * 0.28), (f) => st.size * (0.18 + f * 2.2));
    writeRibbon(ion.current, cam.position, (f, out) => out.copy(C_HEAD).addScaledVector(C_ION, f * st.length * 1.25), (f) => st.size * (0.08 + f * 0.45));
    (dust.current.material as ShaderMaterial).uniforms.uBrightness.value = 0.6 * env;
    (ion.current.material as ShaderMaterial).uniforms.uBrightness.value = 0.5 * env;
    if (coma.current) {
      coma.current.position.copy(C_HEAD);
      coma.current.scale.setScalar(st.size * 4.2);
      (coma.current.material as SpriteMaterial).opacity = 0.9 * env;
    }
    if (flare.current) {
      flare.current.position.copy(C_HEAD);
      flare.current.scale.setScalar(st.size * 3.2 * (0.85 + 0.15 * Math.sin(t * 3)));
      (flare.current.material as SpriteMaterial).opacity = env;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* 먼지 꼬리 */}
      <mesh ref={dust} frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustGeo.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aAlong" args={[dustGeo.along, 1]} />
          <bufferAttribute attach="attributes-aAcross" args={[dustGeo.across, 1]} />
          <bufferAttribute attach="index" args={[dustGeo.index, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={TRAIL_VERT} fragmentShader={TRAIL_FRAG} uniforms={dustUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {/* 이온 꼬리 */}
      <mesh ref={ion} frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ionGeo.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aAlong" args={[ionGeo.along, 1]} />
          <bufferAttribute attach="attributes-aAcross" args={[ionGeo.across, 1]} />
          <bufferAttribute attach="index" args={[ionGeo.index, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={TRAIL_VERT} fragmentShader={TRAIL_FRAG} uniforms={ionUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <sprite ref={coma} renderOrder={2}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[comaTex]} />
        </spriteMaterial>
      </sprite>
      <sprite ref={flare} renderOrder={2}>
        <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending} color="#eef0ff">
          <canvasTexture attach="map" args={[flareTex]} />
        </spriteMaterial>
      </sprite>
    </group>
  );
}

/** 카메라를 향하는 띠: 샘플마다 중심점(point)과 폭(width)을 받아 양옆 두 점을 쓴다 */
function writeRibbon(m: Mesh, camPos: Vector3, point: (f: number, out: Vector3) => Vector3, width: (f: number) => number) {
  const pos = (m.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;
  for (let i = 0; i < SAMPLES; i++) {
    const f = i / (SAMPLES - 1);
    point(f, C_P);
    // 이웃 샘플로 진행 방향을 어림한다
    point(Math.min(1, f + 1 / (SAMPLES - 1)), C_TAN).sub(C_P);
    if (i === SAMPLES - 1) point(f - 1 / (SAMPLES - 1), C_TAN).sub(C_P).negate();
    C_TO_CAM.subVectors(camPos, C_P);
    C_SIDE.crossVectors(C_TAN, C_TO_CAM).normalize();
    const w = width(f);
    const j = i * 6;
    pos[j] = C_P.x + C_SIDE.x * w;
    pos[j + 1] = C_P.y + C_SIDE.y * w;
    pos[j + 2] = C_P.z + C_SIDE.z * w;
    pos[j + 3] = C_P.x - C_SIDE.x * w;
    pos[j + 4] = C_P.y - C_SIDE.y * w;
    pos[j + 5] = C_P.z - C_SIDE.z * w;
  }
  m.geometry.getAttribute("position").needsUpdate = true;
}
