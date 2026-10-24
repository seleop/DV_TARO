"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, Color, DynamicDrawUsage, Vector3, type Group, type Mesh, type Points, type ShaderMaterial, type Sprite, type SpriteMaterial } from "three";
import { glowCanvas, smooth, type JourneyClock } from "./common";
import { mulberry32 } from "./journey";
import { ribbonBuffers } from "./ShootingStar";
import { ONCOMING_VERT, STAR_FRAG, TRAIL_FRAG, TRAIL_VERT } from "./shaders";
import type { Director } from "./stages";

/** 날아오는 빛의 색: 흰빛·라벤더를 바탕으로 청록·분홍·금빛 */
const TINTS = ["#ffffff", "#dcd0ff", "#8ff0ff", "#ff9ad6", "#ffd98a", "#b9a6ff"].map((c) => new Color(c));
const FAR = 140;

/** 지금 날아오는 속도(초당): 장의 속도·전환 가속이 클수록 빠르다 */
function rushSpeed(director: Director) {
  const pace = Math.max(0, director.pace() - 0.3);
  return 16 + 48 * pace + 40 * director.surge;
}

/**
 * 앞에서 날아오는 빛 알갱이·먼지 (속도감): 카메라에 붙은 공간에서 멀리(140) 앞에서 생겨 카메라 쪽으로 다가오며
 * 커지고 밝아지다가 화면 가장자리로 스쳐 지나간다. 화면 가운데(별똥별 자리)는 비워 둔다.
 * 장의 속도·전환 가속(surge)이 클수록 빨라진다. 버퍼는 미리 만들어 재사용한다(매 프레임 새 객체 없음).
 */
export function OncomingLights({ director, clock, count, pixelRatio }: { director: Director; clock: JourneyClock; count: number; pixelRatio: number }) {
  const group = useRef<Group>(null);
  const pts = useRef<Points>(null);
  const data = useMemo(() => {
    const rand = mulberry32(8181);
    const position = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      spawn(rand, position, i, -rand() * FAR);
      // 대부분은 작은 먼지, 가끔 큰 빛 덩이
      size[i] = rand() < 0.12 ? 1.6 + rand() * 1.6 : 0.4 + rand() * 0.8;
      const c = TINTS[Math.floor(rand() * TINTS.length)];
      color.set([c.r, c.g, c.b], i * 3);
      speed[i] = 0.7 + rand() * 0.6;
    }
    return { position, size, color, speed, rand };
  }, [count]);
  const uniforms = useMemo(() => ({ uPixelRatio: { value: pixelRatio }, uFar: { value: FAR }, uIntensity: { value: 1 } }), [pixelRatio]);

  useFrame(({ camera }) => {
    const g = group.current;
    const p = pts.current;
    if (!g || !p) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const dt = clock.dt;
    const v = rushSpeed(director);
    const pos = (p.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 2] += v * data.speed[i] * dt;
      if (pos[i * 3 + 2] > -1) spawn(data.rand, pos, i, -FAR);
    }
    p.geometry.getAttribute("position").needsUpdate = true;
    (p.material as ShaderMaterial).uniforms.uIntensity.value = (0.75 + 0.25 * Math.min(1, director.surge * 2)) * (1 - director.values.finale * 0.5);
  });

  return (
    <group ref={group}>
      <points ref={pts} frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[data.color, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={ONCOMING_VERT} fragmentShader={STAR_FRAG} uniforms={uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}

/** 새 빛 알갱이: 화면 가운데를 비운 고리 모양 영역, 깊이 z */
function spawn(rand: () => number, pos: Float32Array, i: number, z: number) {
  const a = rand() * Math.PI * 2;
  const r = 2.5 + Math.pow(rand(), 0.7) * 16;
  pos[i * 3] = Math.cos(a) * r * 0.7;
  pos[i * 3 + 1] = Math.sin(a) * r;
  pos[i * 3 + 2] = z;
}

const FB_SAMPLES = 16;
const FB_P = new Vector3();
const FB_SIDE = new Vector3();
const FB_TO_CAM = new Vector3();
const FB_DIR = new Vector3(0, 0, -1);
const FB_COLORS: Array<[string, string]> = [
  ["#8ff0ff", "#2f6cff"],
  ["#ff9ad6", "#8a3cff"],
  ["#ffd98a", "#ff6a8a"],
  ["#d8c8ff", "#5a4cff"],
];

/**
 * 스쳐 지나가는 작은 혜성: 가끔(장이 역동적일수록 자주) 앞 멀리서 나타나 카메라 옆을 빠르게 스쳐 간다.
 * 머리는 둥근 빛, 꼬리는 앞쪽(지나온 쪽)으로 길게 남는다. 색은 청록·분홍·금빛·라벤더 중 하나.
 */
export function FlybyComet({ seed, director, clock }: { seed: number; director: Director; clock: JourneyClock }) {
  const group = useRef<Group>(null);
  const tail = useRef<Mesh>(null);
  const head = useRef<Sprite>(null);
  const geo = useMemo(() => ribbonBuffers(FB_SAMPLES), []);
  const uniforms = useMemo(() => ({ uBrightness: { value: 0 }, uHead: { value: new Color("#ffffff") }, uMid: { value: new Color("#8ff0ff") }, uTail: { value: new Color("#2f6cff") } }), []);
  const headTex = useMemo(() => glowCanvas(["rgba(255,255,255,1)", "rgba(255,255,255,0.5)", "rgba(220,220,255,0.12)", "rgba(200,200,255,0)"], 64), []);
  const s = useRef({ rand: mulberry32(seed), next: 2 + (seed % 5), alive: false, pos: new Vector3(), speed: 60, length: 12 });

  useFrame(({ camera }) => {
    const g = group.current;
    const m = tail.current;
    if (!g || !m) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const st = s.current;
    const t = clock.time;
    if (!st.alive && t >= st.next) {
      // 화면 가장자리 쪽 먼 앞에서 시작
      const a = st.rand() * Math.PI * 2;
      const r = 4 + st.rand() * 6;
      st.pos.set(Math.cos(a) * r * 0.75, Math.sin(a) * r, -110 - st.rand() * 30);
      st.speed = 55 + st.rand() * 30;
      st.length = 10 + st.rand() * 10;
      const [mid, end] = FB_COLORS[Math.floor(st.rand() * FB_COLORS.length)];
      const u = (m.material as ShaderMaterial).uniforms;
      (u.uMid.value as Color).set(mid);
      (u.uTail.value as Color).set(end);
      if (head.current) (head.current.material as SpriteMaterial).color.set(mid);
      st.alive = true;
    }
    if (!st.alive) {
      g.visible = false;
      return;
    }
    st.pos.z += st.speed * (0.6 + 0.6 * director.values.energy + director.surge) * clock.dt;
    if (st.pos.z > -1.5) {
      st.alive = false;
      // 역동적인 장일수록 자주
      st.next = t + (6 - 3.5 * director.values.energy) + st.rand() * 4;
      g.visible = false;
      return;
    }
    g.visible = true;
    const z = -st.pos.z;
    const env = smooth(5, 25, z) * (1 - smooth(100, 140, z));
    const pos = (m.geometry.getAttribute("position") as BufferAttribute).array as Float32Array;
    for (let i = 0; i < FB_SAMPLES; i++) {
      const f = i / (FB_SAMPLES - 1);
      // 꼬리는 지나온 쪽(더 먼 앞)으로
      FB_P.copy(st.pos).addScaledVector(FB_DIR, f * st.length);
      FB_TO_CAM.copy(FB_P).negate();
      FB_SIDE.crossVectors(FB_DIR, FB_TO_CAM).normalize();
      const w = 0.16 * Math.pow(1 - f, 0.8) + 0.01;
      const j = i * 6;
      pos[j] = FB_P.x + FB_SIDE.x * w;
      pos[j + 1] = FB_P.y + FB_SIDE.y * w;
      pos[j + 2] = FB_P.z + FB_SIDE.z * w;
      pos[j + 3] = FB_P.x - FB_SIDE.x * w;
      pos[j + 4] = FB_P.y - FB_SIDE.y * w;
      pos[j + 5] = FB_P.z - FB_SIDE.z * w;
    }
    m.geometry.getAttribute("position").needsUpdate = true;
    (m.material as ShaderMaterial).uniforms.uBrightness.value = 0.9 * env;
    if (head.current) {
      head.current.position.copy(st.pos);
      head.current.scale.setScalar(0.9);
      (head.current.material as SpriteMaterial).opacity = env;
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={tail} frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geo.position, 3]} usage={DynamicDrawUsage} />
          <bufferAttribute attach="attributes-aAlong" args={[geo.along, 1]} />
          <bufferAttribute attach="attributes-aAcross" args={[geo.across, 1]} />
          <bufferAttribute attach="index" args={[geo.index, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={TRAIL_VERT} fragmentShader={TRAIL_FRAG} uniforms={uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
      </mesh>
      <sprite ref={head} renderOrder={6}>
        <spriteMaterial transparent depthWrite={false} depthTest={false} blending={AdditiveBlending}>
          <canvasTexture attach="map" args={[headTex]} />
        </spriteMaterial>
      </sprite>
    </group>
  );
}
