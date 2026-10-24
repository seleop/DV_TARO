"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, Object3D, Vector3, type CatmullRomCurve3, type Group, type Mesh, type ShaderMaterial, type Sprite } from "three";
import { PLANET_FRAG, PLANET_VERT } from "./Planets";
import { faceAndLight, nebulaUniforms } from "./CosmicEffects";
import { flareCanvas, type JourneyClock } from "./common";
import { gaussian, mulberry32 } from "./journey";
import type { JourneyPaths } from "./stages";
import { GALAXY_FRAG, GALAXY_VERT, NEBULA_FRAG, NEBULA_VERT, STAR_FRAG, STAR_VERT } from "./shaders";

/**
 * 하늘(가장 먼 층): 카메라 위치를 따라다니는 하늘 공(회전은 따르지 않음)에 붙어 거의 움직이지 않는다.
 * 가까운 별·구름·소행성이 빠르게 지나가는 동안 이 층은 카메라가 방향을 틀 때만 천천히 흘러, 층마다 시차가 생긴다.
 *  - 나선 은하 다섯: 그림이 아니라 셰이더로 계산한 원반(팔·먼지띠·중심빛) + 반짝이는 별 입자.
 *    화면에 고정하지 않고 하늘의 정해진 자리에 두되, 유람 경로의 여러 구간에서 바라보는 방향 근처에 놓아
 *    가입하는 동안 차례로 나타났다 흘러간다. 크기는 세로 화면 가로 폭의 절반 남짓을 넘지 않는다
 *  - 행성과 위성(첫 은하 왼쪽 아래), 화면을 채우는 보라·파랑 성운, 십자 빛 별
 */
export function SkyBox({ clock, paths, heroStars, skyNebulae, flares, pixelRatio }: { clock: JourneyClock; paths: JourneyPaths; heroStars: number; skyNebulae: number; flares: number; pixelRatio: number }) {
  const sky = useRef<Group>(null);
  const meshes = useRef<Array<Mesh | null>>([]);
  const spins = useRef<Array<Group | null>>([]);
  const galaxies = useMemo(() => buildGalaxies(paths, heroStars, pixelRatio), [paths, heroStars, pixelRatio]);
  const light = useMemo(() => new Vector3(...galaxies[0].position).normalize(), [galaxies]);
  const planet = useMemo(() => placePlanet(paths), [paths]);
  const clouds = useMemo(() => placeSkyNebulae(skyNebulae), [skyNebulae]);
  const flareList = useMemo(() => placeFlares(flares), [flares]);
  const flareTex = useMemo(() => flareCanvas(), []);
  const skyPlanet = useMemo(() => planetUniforms("#26308f", "#8a63f0", "#c2b0ff", light), [light]);
  const skyMoon = useMemo(() => planetUniforms("#343a78", "#9aa4e0", "#d6dcff", light), [light]);

  useFrame(({ camera }) => {
    const t = clock.time;
    // 하늘은 카메라 위치만 따라간다 (아주 멀리 있는 것처럼)
    if (sky.current) sky.current.position.copy(camera.position);
    // 하늘 성운은 첫 은하 쪽에서 빛을 받는다
    for (const m of meshes.current) if (m) faceAndLight(m, camera, t, light, false);
    spins.current.forEach((g, i) => {
      if (!g) return;
      // 은하는 아주 천천히 자기 원반 축으로 돈다
      g.rotation.z = galaxies[i].spin * t;
      const pts = g.children[1] as Mesh | undefined;
      const m = pts?.material as ShaderMaterial | undefined;
      if (m?.uniforms.uTime) m.uniforms.uTime.value = t;
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

      {galaxies.map((g, i) => (
        <group key={`g${i}`} position={g.position} quaternion={g.quaternion}>
          <group
            ref={(el) => {
              spins.current[i] = el;
            }}
          >
            {/* 원반: 팔·먼지띠·중심빛 */}
            <mesh scale={g.radius * 2} frustumCulled={false} renderOrder={-1}>
              <planeGeometry args={[1, 1]} />
              <shaderMaterial vertexShader={GALAXY_VERT} fragmentShader={GALAXY_FRAG} uniforms={g.discUniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
            </mesh>
            {/* 팔을 따라 반짝이는 별 */}
            <points frustumCulled={false} renderOrder={-1}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[g.data.position, 3]} />
                <bufferAttribute attach="attributes-aSize" args={[g.data.size, 1]} />
                <bufferAttribute attach="attributes-aPhase" args={[g.data.phase, 1]} />
                <bufferAttribute attach="attributes-aColor" args={[g.data.color, 3]} />
              </bufferGeometry>
              <shaderMaterial vertexShader={STAR_VERT} fragmentShader={STAR_FRAG} uniforms={g.starUniforms} transparent depthWrite={false} depthTest={false} blending={AdditiveBlending} />
            </points>
          </group>
        </group>
      ))}

      {/* 행성과 위성: 첫 은하 쪽에서 빛을 받아 그쪽 가장자리가 빛난다.
          하늘 성운·은하보다 가까우므로 그 다음에 그려 가린다 (불투명 단계에서 먼저 그리면 성운이 위에 덮여 비쳐 보임) */}
      <mesh position={planet.planet} scale={10} rotation={[0.4, 0.8, 0.2]} renderOrder={-0.5}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={skyPlanet} depthTest={false} transparent />
      </mesh>
      <mesh position={planet.moon} scale={2.2} renderOrder={-0.5}>
        <sphereGeometry args={[1, 32, 24]} />
        <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={skyMoon} depthTest={false} transparent />
      </mesh>

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

/** 하늘 방향: 방위각(도)·고도(도) → 반지름 r의 점. 방위각이 커지면 그 방향을 보는 화면의 오른쪽 */
function skyDir(azDeg: number, elDeg: number, r: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.cos(az) * r, Math.sin(el) * r, Math.cos(el) * Math.sin(az) * r];
}

const YAW_T = new Vector3();
/** 경로의 u 지점에서 진행 방향의 방위각(도): 카메라가 별똥별 뒤에서 그쪽을 바라본다 */
function yawAt(curve: CatmullRomCurve3, u: number) {
  curve.getTangentAt(u, YAW_T);
  return (Math.atan2(YAW_T.z, YAW_T.x) * 180) / Math.PI;
}

/** 행성·위성: 첫 은하보다 왼쪽 아래 */
function placePlanet(paths: JourneyPaths) {
  const az = yawAt(paths.a, 0.12);
  return { planet: skyDir(az - 15, -7, SKY_R * 0.75), moon: skyDir(az - 8, -11, SKY_R * 0.74) };
}

/** 하늘을 채우는 성운: 수평선 위아래로 크고 진한 보라·파랑 구름을 고르게 두른다 */
function placeSkyNebulae(n: number) {
  const rand = mulberry32(8080);
  const palette: Array<[string, string]> = [
    ["#2a12a0", "#b067ff"],
    ["#1426a8", "#5d86ff"],
    ["#4a128f", "#e08aff"],
    ["#1c1b8c", "#8a72ff"],
  ];
  return Array.from({ length: n }, (_, i) => {
    const az = (i / n) * 360 + rand() * 25;
    const el = -24 + rand() * 44;
    const [a, b] = palette[i % palette.length];
    return {
      position: skyDir(az, el, SKY_R * (0.85 + rand() * 0.2)),
      size: 110 + rand() * 90,
      aspect: 0.55 + rand() * 0.35,
      uniforms: nebulaUniforms({ seed: rand() * 10, a, b, opacity: 0.9 + rand() * 0.4, nearFade: 1 }),
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

type GalaxySpec = { curve: "a" | "b" | "c"; u: number; dAz: number; el: number; radius: number; arms: number; twist: number; share: number; seed: number; tilt: number; spin: number; inner: string; outer: string };

/**
 * 하늘의 나선 은하: 경로의 여러 구간에서 카메라가 바라보는 방향 근처(조금 옆·위)에 하나씩.
 * 첫 은하(이메일 단계에 보이는 곳)가 가장 크고, 나머지는 작거나 멀다. 원반은 카메라 쪽을 보다가 비스듬히 기운다.
 */
function buildGalaxies(paths: JourneyPaths, heroStars: number, pixelRatio: number) {
  const specs: GalaxySpec[] = [
    { curve: "a", u: 0.1, dAz: 6, el: 3, radius: 18, arms: 2, twist: 2.4, share: 0.45, seed: 31, tilt: 0.55, spin: 0.012, inner: "#ff9fe6", outer: "#5a7dff" },
    { curve: "a", u: 0.16, dAz: -15, el: 10, radius: 7, arms: 2, twist: 2.8, share: 0.1, seed: 47, tilt: 0.95, spin: -0.018, inner: "#ffc2f0", outer: "#8a7dff" },
    { curve: "b", u: 0.33, dAz: 11, el: 6, radius: 14, arms: 3, twist: 2.1, share: 0.2, seed: 59, tilt: 0.7, spin: 0.014, inner: "#f2a8ff", outer: "#4f6cff" },
    { curve: "c", u: 0.55, dAz: -9, el: 7, radius: 13, arms: 2, twist: 2.6, share: 0.15, seed: 71, tilt: 0.8, spin: -0.012, inner: "#ffb0e0", outer: "#6a5cff" },
    { curve: "a", u: 0.8, dAz: 12, el: 8, radius: 10, arms: 2, twist: 2.2, share: 0.1, seed: 83, tilt: 0.6, spin: 0.016, inner: "#ffd0f4", outer: "#7a8cff" },
  ];
  return specs.map((g) => {
    const pos = new Vector3(...skyDir(yawAt(paths[g.curve], g.u) + g.dAz, g.el, SKY_R * 0.92));
    // 원반(XY 평면, 법선 +Z)이 하늘 공 중심(카메라)을 마주 보게 한 뒤 조금 기울인다
    const o = new Object3D();
    o.position.copy(pos);
    o.lookAt(0, 0, 0);
    o.rotateX(g.tilt);
    o.rotateZ(0.4);
    return {
      position: pos.toArray() as [number, number, number],
      quaternion: o.quaternion.clone(),
      radius: g.radius,
      spin: g.spin,
      data: buildSpiral(Math.round(heroStars * g.share), g.radius, g.arms, g.twist, g.seed, g.inner, g.outer),
      discUniforms: {
        uArms: { value: g.arms },
        uTwist: { value: g.twist },
        uSeed: { value: g.seed * 0.37 },
        uOpacity: { value: 0.95 },
        uInner: { value: new Color(g.inner) },
        uOuter: { value: new Color(g.outer) },
      },
      starUniforms: { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio }, uScale: { value: 260 }, uTwinkle: { value: 0.35 } },
    };
  });
}

/** 은하 팔을 따라 반짝이는 별 입자: 셰이더의 팔(로그 나선)과 같은 식으로 놓는다 */
function buildSpiral(n: number, radius: number, arms: number, twist: number, seed: number, inner: string, outer: string) {
  const rand = mulberry32(seed);
  const position = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const color = new Float32Array(n * 3);
  const core = new Color("#fff0fa");
  const a = new Color(inner);
  const b = new Color(outer);
  const c = new Color();
  for (let i = 0; i < n; i++) {
    const k = 0.04 + Math.pow(rand(), 1.3) * 0.92;
    const theta = ((i % arms) / arms) * Math.PI * 2 + Math.log(k + 0.05) * twist + gaussian(rand) * 0.12;
    const r = k * radius;
    position[i * 3] = Math.cos(theta) * r + gaussian(rand) * radius * 0.015;
    position[i * 3 + 1] = Math.sin(theta) * r + gaussian(rand) * radius * 0.015;
    position[i * 3 + 2] = gaussian(rand) * radius * 0.01;
    if (k < 0.12) c.copy(core).lerp(a, k / 0.12);
    else c.copy(a).lerp(b, Math.min(1, (k - 0.12) * 1.6));
    color.set([c.r, c.g, c.b], i * 3);
    size[i] = 0.6 + rand() * 1.1;
    phase[i] = rand();
  }
  return { position, size, phase, color };
}

function planetUniforms(a: string, b: string, rim: string, light: Vector3) {
  return { uLight: { value: light.clone() }, uColorA: { value: new Color(a) }, uColorB: { value: new Color(b) }, uRim: { value: new Color(rim) } };
}
