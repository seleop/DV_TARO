"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, Object3D, Quaternion, Vector3, type Group, type Mesh, type Points, type ShaderMaterial, type Sprite } from "three";
import { LIGHT_DIR, PLANET_FRAG, PLANET_VERT } from "./Planets";
import { flareCanvas, glowCanvas, type JourneyClock } from "./common";
import { gaussian, mulberry32 } from "./journey";
import { NEBULA_FRAG, NEBULA_VERT, STAR_FRAG, STAR_VERT } from "./shaders";

/**
 * 하늘(아주 먼 배경): 카메라 위치를 따라다니는 하늘 공(회전은 따르지 않음)에 붙어,
 * 카메라가 어디를 지나든 같은 하늘이 보인다 (레퍼런스: 큰 나선 은하·작은 은하·화면을 채우는 보라·파랑 성운·십자 빛 별).
 * 방향은 카메라가 주로 바라보는 수평선보다 조금 위(화면 위쪽)에 몰아 둔다.
 * 큰 나선 은하와 행성 하나는 '앞쪽 하늘' 묶음에 있어, 카메라가 향하는 방향을 느리게 뒤따라 돈다.
 * 그래서 레퍼런스처럼 은하가 화면 위쪽에, 행성이 왼쪽에 자주 걸리고, 방향을 틀 때는 천천히 흘러가 멀리 있는 것처럼 보인다.
 */
const FWD = new Vector3();
/** 앞쪽 하늘 행성이 받는 빛: 은하가 있는 오른쪽 위·앞에서 (앞쪽 하늘 묶음 기준 방향) */
const FRONT_LIGHT = new Vector3(0.55, 0.45, 0.7).normalize();
export function SkyBox({ clock, heroStars, skyNebulae, flares, pixelRatio }: { clock: JourneyClock; heroStars: number; skyNebulae: number; flares: number; pixelRatio: number }) {
  const sky = useRef<Group>(null);
  const front = useRef<Group>(null);
  const yaw = useRef({ ready: false, value: 0 });
  const meshes = useRef<Array<Mesh | null>>([]);
  const galaxyRefs = useRef<Array<Object3D | null>>([]);
  const galaxies = useMemo(() => buildGalaxies(heroStars, pixelRatio), [heroStars, pixelRatio]);
  const clouds = useMemo(() => placeSkyNebulae(skyNebulae), [skyNebulae]);
  const flareList = useMemo(() => placeFlares(flares), [flares]);
  const flareTex = useMemo(() => flareCanvas(), []);
  const skyPlanet = useMemo(() => planetUniforms("#26308f", "#8a63f0", "#c2b0ff"), []);
  const skyMoon = useMemo(() => planetUniforms("#343a78", "#9aa4e0", "#d6dcff"), []);
  const coreTex = useMemo(() => glowCanvas(["rgba(255,240,250,1)", "rgba(255,190,235,0.55)", "rgba(170,120,255,0.18)", "rgba(80,60,200,0)"], 128), []);

  useFrame(({ camera }) => {
    const t = clock.time;
    // 하늘은 카메라 위치만 따라간다 (멀리 있는 것처럼 보이게)
    if (sky.current) sky.current.position.copy(camera.position);
    // 앞쪽 하늘: 카메라가 향하는 방위각을 느리게(지연을 두고) 뒤따라 돈다
    camera.getWorldDirection(FWD);
    const target = Math.atan2(FWD.z, FWD.x);
    const y = yaw.current;
    if (!y.ready || clock.dt === 0) {
      y.value = target;
      y.ready = true;
    } else {
      let diff = target - y.value;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      y.value += diff * (1 - Math.exp(-0.35 * clock.dt));
    }
    if (front.current) {
      front.current.rotation.y = -y.value;
      // 행성 빛 방향도 앞쪽 하늘과 함께 돈다 (셰이더는 세계 좌표의 빛 방향을 쓴다)
      skyPlanet.uLight.value.copy(FRONT_LIGHT).applyQuaternion(front.current.quaternion);
      skyMoon.uLight.value.copy(skyPlanet.uLight.value);
    }
    const q = camera.quaternion;
    for (const m of meshes.current) {
      if (!m) continue;
      m.quaternion.copy(q);
      (m.material as ShaderMaterial).uniforms.uTime.value = t;
    }
    galaxyRefs.current.forEach((p, i) => {
      if (!p) return;
      ((p as Points).material as ShaderMaterial).uniforms.uTime.value = t;
      // 은하는 아주 천천히 자기 축(원반의 법선)으로 돈다
      p.rotation.z = galaxies[i].spin * t;
    });
  });

  return (
    <group ref={sky}>
      {clouds.map((c, i) => (
        <mesh
          key={`n${i}`}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={c.position}
          scale={[c.size, c.size * c.aspect, 1]}
          frustumCulled={false}
          renderOrder={-2}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial vertexShader={NEBULA_VERT} fragmentShader={NEBULA_FRAG} uniforms={c.uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
        </mesh>
      ))}

      <group ref={front}>
        {/* 앞쪽 하늘의 행성 (왼쪽 아래, 빛을 받는 쪽과 빛나는 테두리) */}
        <mesh position={skyDir(-13, -9, SKY_R * 0.75)} scale={11} rotation={[0.4, 0.8, 0.2]} renderOrder={0}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={skyPlanet} depthTest={false} />
        </mesh>
        <mesh position={skyDir(-6, -13, SKY_R * 0.74)} scale={2.4} renderOrder={0}>
          <sphereGeometry args={[1, 32, 24]} />
          <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={skyMoon} depthTest={false} />
        </mesh>
        {galaxies.map((g, i) =>
          g.front ? (
          <group key={`g${i}`} position={g.position} quaternion={g.quaternion}>
          <points
            ref={(el) => {
              galaxyRefs.current[i] = el;
            }}
            frustumCulled={false}
            renderOrder={-1}
          >
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[g.data.position, 3]} />
              <bufferAttribute attach="attributes-aSize" args={[g.data.size, 1]} />
              <bufferAttribute attach="attributes-aPhase" args={[g.data.phase, 1]} />
              <bufferAttribute attach="attributes-aColor" args={[g.data.color, 3]} />
            </bufferGeometry>
            <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={g.uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
          </points>
          {/* 은하 중심의 밝은 빛 (분홍빛 흰색) */}
          <sprite scale={[g.radius * 0.5, g.radius * 0.5, 1]} renderOrder={-1}>
            <spriteMaterial transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} opacity={g.coreOpacity}>
              <canvasTexture attach="map" args={[coreTex]} />
            </spriteMaterial>
          </sprite>
        </group>
          ) : null,
        )}
      </group>
      {galaxies.map((g, i) =>
        g.front ? null : (
        <group key={`g${i}`} position={g.position} quaternion={g.quaternion}>
          <points
            ref={(el) => {
              galaxyRefs.current[i] = el;
            }}
            frustumCulled={false}
            renderOrder={-1}
          >
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[g.data.position, 3]} />
              <bufferAttribute attach="attributes-aSize" args={[g.data.size, 1]} />
              <bufferAttribute attach="attributes-aPhase" args={[g.data.phase, 1]} />
              <bufferAttribute attach="attributes-aColor" args={[g.data.color, 3]} />
            </bufferGeometry>
            <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={g.uniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
          </points>
          {/* 은하 중심의 밝은 빛 (분홍빛 흰색) */}
          <sprite scale={[g.radius * 0.9, g.radius * 0.9, 1]} renderOrder={-1}>
            <spriteMaterial transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} opacity={g.coreOpacity}>
              <canvasTexture attach="map" args={[coreTex]} />
            </spriteMaterial>
          </sprite>
        </group>
        ),
      )}

      {flareList.map((f, i) => (
        <Flare key={`f${i}`} flare={f} tex={flareTex} clock={clock} />
      ))}
    </group>
  );
}

/** 십자 빛 별 하나: 천천히 반짝인다 */
function Flare({ flare, tex, clock }: { flare: { position: [number, number, number]; size: number; phase: number; color: string }; tex: HTMLCanvasElement; clock: JourneyClock }) {
  const ref = useRef<Sprite>(null);
  useFrame(() => {
    const s = ref.current;
    if (!s) return;
    const k = 0.75 + 0.25 * Math.sin(clock.time * 1.3 + flare.phase);
    s.scale.setScalar(flare.size * k);
  });
  return (
    <sprite ref={ref} position={flare.position} renderOrder={1}>
      <spriteMaterial transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} color={flare.color}>
        <canvasTexture attach="map" args={[tex]} />
      </spriteMaterial>
    </sprite>
  );
}

/* ── 배치 ─────────────────────────────────────────── */

const SKY_R = 140;

/** 하늘 방향: 방위각(도)·고도(도) → 반지름 r의 점 */
function skyDir(azDeg: number, elDeg: number, r: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.cos(az) * r, Math.sin(el) * r, Math.cos(el) * Math.sin(az) * r];
}

/** 하늘을 채우는 성운: 수평선 위아래로 크고 진한 보라·파랑 구름을 고르게 두른다 */
function placeSkyNebulae(n: number) {
  const rand = mulberry32(8080);
  const palette: Array<[string, string]> = [
    ["#3a1aa8", "#b067ff"],
    ["#1830b8", "#5d86ff"],
    ["#5a18a0", "#e08aff"],
    ["#22209a", "#8a72ff"],
  ];
  return Array.from({ length: n }, (_, i) => {
    const az = (i / n) * 360 + rand() * 25;
    const el = -6 + rand() * 30;
    const [a, b] = palette[i % palette.length];
    return {
      position: skyDir(az, el, SKY_R * (0.85 + rand() * 0.2)),
      size: 110 + rand() * 90,
      aspect: 0.55 + rand() * 0.35,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: rand() * 10 },
        uColorA: { value: new Color(a) },
        uColorB: { value: new Color(b) },
        uOpacity: { value: 0.95 + rand() * 0.4 },
      },
    };
  });
}

/** 십자 빛 별: 하늘 곳곳 (수평선보다 조금 위에 더 많이) */
function placeFlares(n: number) {
  const rand = mulberry32(1212);
  const colors = ["#ffffff", "#dcd2ff", "#c3d0ff", "#ffd9f3"];
  return Array.from({ length: n }, (_, i) => ({
    position: skyDir(rand() * 360, -10 + Math.pow(rand(), 0.8) * 50, SKY_R * 0.8),
    size: 2.2 + rand() * 3.2,
    phase: rand() * 6.28,
    color: colors[i % colors.length],
  }));
}

/** 하늘의 은하: 큰 나선 은하 하나 + 작은 은하 둘 (조금 비스듬히 기운 원반) */
function buildGalaxies(heroStars: number, pixelRatio: number) {
  const specs = [
    // 앞쪽 하늘(카메라 방향 기준, 방위각 +는 화면 오른쪽). 카메라가 별똥별을 약 16° 내려다보고
    // 세로 화면 시야가 위로 약 +11°·옆으로 약 ±14°까지라, 그 안에 들어오게 둔다
    // 큰 나선 은하: 화면 위쪽 오른편을 크게 채운다
    { az: 9, el: 1, radius: 40, arms: 2, n: heroStars, seed: 31, tilt: 0.5, coreOpacity: 1, spin: 0.01, front: true },
    { az: -9, el: 6, radius: 10, arms: 2, n: Math.round(heroStars * 0.2), seed: 47, tilt: 0.95, coreOpacity: 0.75, spin: -0.015, front: true },
    { az: 200, el: 12, radius: 26, arms: 3, n: Math.round(heroStars * 0.3), seed: 59, tilt: 0.75, coreOpacity: 0.8, spin: 0.012, front: false },
  ];
  return specs.map((g) => {
    const pos = new Vector3(...skyDir(g.az, g.el, SKY_R * 0.92));
    // 원반(XY 평면, 법선 +Z)이 하늘 공 중심(카메라)을 마주 보게 한 뒤 조금 기울인다
    const o = new Object3D();
    o.position.copy(pos);
    o.lookAt(0, 0, 0);
    o.rotateX(g.tilt);
    o.rotateZ(0.4);
    return {
      front: g.front,
      position: pos.toArray() as [number, number, number],
      quaternion: o.quaternion.clone() as Quaternion,
      radius: g.radius,
      coreOpacity: g.coreOpacity,
      spin: g.spin,
      data: buildSpiral(g.n, g.radius, g.arms, g.seed),
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: 300 }, uTwinkle: { value: 0.3 } },
    };
  });
}

/** 나선 은하 입자: 중심은 분홍빛 흰색, 팔은 라벤더·파랑·바이올렛 */
function buildSpiral(n: number, radius: number, arms: number, seed: number) {
  const rand = mulberry32(seed);
  const position = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const core = new Color("#fff0fa");
  const pink = new Color("#ffb3e6");
  const lav = new Color("#b9a4ff");
  const blue = new Color("#5a78ff");
  const violet = new Color("#8a4dff");
  const c = new Color();
  for (let i = 0; i < n; i++) {
    const k = Math.pow(rand(), 1.6);
    const r = k * radius;
    const arm = ((i % arms) / arms) * Math.PI * 2;
    const theta = arm + k * 6.5 + gaussian(rand) * (0.09 + k * 0.05);
    // XY 평면의 원반 (두께는 Z)
    position[i * 3] = Math.cos(theta) * r + gaussian(rand) * radius * 0.02;
    position[i * 3 + 1] = Math.sin(theta) * r + gaussian(rand) * radius * 0.02;
    position[i * 3 + 2] = gaussian(rand) * radius * 0.02 * (1 - k * 0.7);
    if (k < 0.12) c.copy(core).lerp(pink, k / 0.12);
    else c.copy(pink).lerp(lav, Math.min(1, (k - 0.12) * 2.5)).lerp(blue, Math.max(0, k - 0.45) * 1.6);
    if (rand() < 0.2) c.lerp(violet, 0.5);
    color.set([c.r, c.g, c.b], i * 3);
    size[i] = (k < 0.1 ? 1.6 : 0.8) + rand() * 1.1;
    phase[i] = rand();
  }
  return { position, size, phase, color };
}

function planetUniforms(a: string, b: string, rim: string) {
  return { uLight: { value: LIGHT_DIR.clone() }, uColorA: { value: new Color(a) }, uColorB: { value: new Color(b) }, uRim: { value: new Color(rim) } };
}
