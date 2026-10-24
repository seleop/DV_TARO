"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, Vector3, type Group, type Points, type ShaderMaterial } from "three";
import { bandPoint, gaussian, mulberry32 } from "./journey";
import { STAR_FRAG, STAR_VERT } from "./shaders";
import { glowCanvas, type JourneyClock } from "./common";

/**
 * 별의 바다: 나선 은하 원반(여러 깊이에 흩어진 별·먼지띠 색) + 아주 먼 배경 별 껍질 + 은하 중심의 은은한 빛.
 * 카메라가 원반 안을 지나가므로 가까운 별·먼 별이 서로 다른 속도로 지나가며 깊이(시차)가 생긴다.
 */
export function GalaxyField({
  clock,
  galaxyStars,
  farStars,
  bandStars,
  pixelRatio,
}: {
  clock: JourneyClock;
  galaxyStars: number;
  farStars: number;
  bandStars: number;
  pixelRatio: number;
}) {
  const spin = useRef<Group>(null);
  const disk = useRef<Points>(null);
  const far = useRef<Points>(null);
  const band = useRef<Points>(null);

  const diskData = useMemo(() => buildDisk(galaxyStars), [galaxyStars]);
  const farData = useMemo(() => buildFarShell(farStars), [farStars]);
  const bandData = useMemo(() => buildBand(bandStars), [bandStars]);
  const bandUniforms = useMemo(() => starUniforms(pixelRatio, 430, 0.6), [pixelRatio]);
  const diskUniforms = useMemo(() => starUniforms(pixelRatio, 95, 0.45), [pixelRatio]);
  const farUniforms = useMemo(() => starUniforms(pixelRatio, 260, 1), [pixelRatio]);
  const core = useMemo(() => glowCanvas(["rgba(255,244,255,0.95)", "rgba(206,182,255,0.45)", "rgba(110,80,220,0.12)", "rgba(40,30,120,0)"]), []);

  useFrame(() => {
    const t = clock.time;
    // 은하는 아주 천천히 돈다 (시간 기반: 프레임 수와 무관)
    if (spin.current) spin.current.rotation.y = t * 0.004;
    for (const p of [disk.current, far.current, band.current]) {
      const m = p?.material as ShaderMaterial | undefined;
      if (m) m.uniforms.uTime.value = t;
    }
  });

  return (
    <group>
      <group ref={spin} rotation={[0.06, 0, 0.04]}>
        <points ref={disk} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[diskData.position, 3]} />
            <bufferAttribute attach="attributes-aSize" args={[diskData.size, 1]} />
            <bufferAttribute attach="attributes-aPhase" args={[diskData.phase, 1]} />
            <bufferAttribute attach="attributes-aColor" args={[diskData.color, 3]} />
          </bufferGeometry>
          <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={diskUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
        </points>
        {/* 은하 중심의 은은한 빛 */}
        <sprite scale={[90, 90, 1]} position={[0, 0, 0]}>
          <spriteMaterial transparent depthWrite={false} blending={AdditiveBlending} opacity={0.8}>
            <canvasTexture attach="map" args={[core]} />
          </spriteMaterial>
        </sprite>
      </group>
      <points ref={far} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farData.position, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[farData.size, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[farData.phase, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[farData.color, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={farUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
      {/* 하늘을 가로지르는 은하수 띠 */}
      <points ref={band} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[bandData.position, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[bandData.size, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[bandData.phase, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[bandData.color, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={bandUniforms} transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}

function starUniforms(pixelRatio: number, scale: number, twinkle: number) {
  return { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: scale }, uTwinkle: { value: twinkle } };
}

type StarData = { position: Float32Array; size: Float32Array; phase: Float32Array; color: Float32Array };

function alloc(n: number): StarData {
  return { position: new Float32Array(n * 3), size: new Float32Array(n), phase: new Float32Array(n), color: new Float32Array(n * 3) };
}

/** 나선 은하 원반: 팔 4개, 바깥으로 갈수록 남색, 중심은 라벤더빛 흰색, 사이사이 바이올렛 */
function buildDisk(n: number): StarData {
  const rand = mulberry32(2026);
  const d = alloc(n);
  const coreC = new Color("#f6ecff");
  const violet = new Color("#9b6bff");
  const lavender = new Color("#c9b6ff");
  const navy = new Color("#3346b8");
  const c = new Color();
  const ARMS = 4;
  for (let i = 0; i < n; i++) {
    const r = 3 + Math.pow(rand(), 0.85) * 72;
    const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
    // 로그 나선을 따라 감기고, 바깥일수록 흩어진다
    const theta = arm + Math.log(r) * 1.9 + gaussian(rand) * (0.12 + r * 0.004);
    const spread = gaussian(rand) * (0.6 + r * 0.05);
    d.position[i * 3] = Math.cos(theta) * r + spread;
    d.position[i * 3 + 1] = gaussian(rand) * (0.35 + 1.9 * Math.exp(-r / 22));
    d.position[i * 3 + 2] = Math.sin(theta) * r + gaussian(rand) * (0.6 + r * 0.05);
    const k = Math.min(1, r / 70);
    c.copy(coreC).lerp(lavender, Math.min(1, k * 2.2)).lerp(navy, Math.max(0, k * 1.3 - 0.3));
    if (rand() < 0.18) c.lerp(violet, 0.65);
    d.color.set([c.r, c.g, c.b], i * 3);
    d.size[i] = rand() < 0.04 ? 3 + rand() * 2.5 : 0.7 + rand() * 1.4;
    d.phase[i] = rand();
  }
  return d;
}

/** 은하수 띠: 가운데가 촘촘하고 가장자리로 갈수록 성기며, 라벤더·흰빛에 바이올렛·남색이 섞인다 */
function buildBand(n: number): StarData {
  const rand = mulberry32(5151);
  const d = alloc(n);
  const p = new Vector3();
  const white = new Color("#f3eeff");
  const lav = new Color("#c4b2ff");
  const violet = new Color("#8a5cf0");
  const navy = new Color("#4057c8");
  const c = new Color();
  for (let i = 0; i < n; i++) {
    const angle = rand() * Math.PI * 2;
    // 띠의 밝은 부분(한쪽)이 더 두껍고 촘촘하다
    const thick = 0.1 + 0.1 * (0.5 + 0.5 * Math.cos(angle - 1.2));
    const offset = gaussian(rand) * thick * 0.5;
    // 지평선보다 조금 위로 올려 카메라가 내려다볼 때도 화면 위쪽에 걸리게 한다
    bandPoint(angle, offset + 0.06, 200 + rand() * 60, p);
    d.position.set([p.x, p.y, p.z], i * 3);
    const k = Math.min(1, Math.abs(offset) / (thick * 1.2));
    c.copy(white).lerp(lav, 0.4 + k * 0.4);
    if (rand() < 0.25) c.lerp(violet, 0.6);
    else if (rand() < 0.2) c.lerp(navy, 0.6);
    d.color.set([c.r, c.g, c.b], i * 3);
    d.size[i] = rand() < 0.03 ? 2.6 + rand() * 1.8 : 0.6 + rand() * 1.1;
    d.phase[i] = rand();
  }
  return d;
}

/** 아주 먼 별 껍질: 어느 쪽을 봐도 별이 보이게 하고, 시차가 거의 없어 원근의 기준이 된다 */
function buildFarShell(n: number): StarData {
  const rand = mulberry32(77);
  const d = alloc(n);
  const tints = [new Color("#ffffff"), new Color("#e4dcff"), new Color("#c7d2fe"), new Color("#d8c4ff")];
  for (let i = 0; i < n; i++) {
    const r = 170 + rand() * 140;
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(rand() * 2 - 1);
    d.position[i * 3] = r * Math.sin(ph) * Math.cos(th);
    d.position[i * 3 + 1] = r * Math.cos(ph);
    d.position[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const t = tints[Math.floor(rand() * tints.length)];
    d.color.set([t.r, t.g, t.b], i * 3);
    d.size[i] = rand() < 0.06 ? 3.2 + rand() * 2 : 1 + rand() * 1.3;
    d.phase[i] = rand();
  }
  return d;
}
