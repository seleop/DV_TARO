"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Euler, IcosahedronGeometry, Matrix4, Quaternion, Vector3, type InstancedMesh, type ShaderMaterial } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smooth, wrap, type JourneyClock } from "./common";
import { gaussian, mulberry32 } from "./journey";
import type { Director, JourneyPaths } from "./stages";

/** 행성·소행성을 비추는 빛의 방향 (하늘의 큰 은하 쪽) */
export const LIGHT_DIR = new Vector3(0.75, 0.35, 0.55).normalize();

export const PLANET_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObj;
  void main() {
    vObj = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** 행성: 빛 받는 쪽은 보라·파랑 띠무늬, 어두운 쪽은 남색, 가장자리는 라벤더빛으로 빛난다 */
export const PLANET_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObj;
  uniform vec3 uLight;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uRim;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    // 빛을 보는 쪽으로 조금 당겨, 어느 방향에서 봐도 빛 받는 초승달 면이 보이게 한다 (어두운 면만 보이면 구름에 묻혀 비쳐 보임)
    vec3 l = normalize(uLight + v * 0.8);
    float diff = max(dot(n, l), 0.0);
    vec3 p = normalize(vObj);
    float band = 0.5 + 0.5 * sin(p.y * 9.0 + sin(p.x * 4.0 + p.z * 3.0) * 1.6);
    float swirl = 0.5 + 0.5 * sin(p.x * 13.0 + p.y * 5.0 + band * 3.0);
    vec3 base = mix(uColorA, uColorB, band) * (0.85 + 0.3 * swirl);
    vec3 lit = base * (0.1 + 1.25 * pow(diff, 1.3));
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 rim = uRim * fres * (0.45 + 1.1 * diff);
    gl_FragColor = vec4(lit + rim, 1.0);
  }
`;

const PLANETS = [
  { position: [64, 16, 34] as const, radius: 11, a: "#2c2f8f", b: "#7b5ce0", rim: "#b8a6ff" },
  { position: [-58, 22, -44] as const, radius: 7, a: "#3a2a7a", b: "#9a7ae8", rim: "#d2c4ff" },
  { position: [-49, 25, -33] as const, radius: 2.2, a: "#3b3d6e", b: "#8a8fc4", rim: "#c9d0ff" },
  { position: [18, -20, 76] as const, radius: 16, a: "#1c2266", b: "#5468d6", rim: "#9fb2ff" },
];

/** 행성 셋 + 위성 하나: 경로 바깥쪽 여러 깊이에 놓여, 지나갈 때 시차가 생긴다 */
export function Planets() {
  const planets = useMemo(
    () =>
      PLANETS.map((p) => ({
        ...p,
        uniforms: {
          uLight: { value: LIGHT_DIR.clone() },
          uColorA: { value: new Color(p.a) },
          uColorB: { value: new Color(p.b) },
          uRim: { value: new Color(p.rim) },
        },
      })),
    [],
  );
  return (
    <group>
      {planets.map((p, i) => (
        <mesh key={i} position={[p.position[0], p.position[1], p.position[2]]} scale={p.radius} rotation={[0.3, i, 0.2]}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial vertexShader={PLANET_VERT} fragmentShader={PLANET_FRAG} uniforms={p.uniforms} />
        </mesh>
      ))}
    </group>
  );
}

/* ── 소행성·떠다니는 파편 ──────────────────────────── */

/** 바위(인스턴스마다 행렬이 다름): 세계 좌표의 면 방향·위치·물체 좌표를 넘긴다 */
const ROCK_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vObj;
  varying mat3 vRot;
  void main() {
    vObj = position;
    mat4 m = modelMatrix * instanceMatrix;
    vec4 w = m * vec4(position, 1.0);
    vW = w.xyz;
    vRot = mat3(m);
    vN = normalize(mat3(m) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/**
 * 바위: 어두운 보랏빛 회색 바탕에 얼룩(작은 무늬), 은하 쪽에서 받는 빛, 별똥별이 지나갈 때 비추는 빛,
 * 그리고 레퍼런스처럼 라벤더빛으로 빛나는 테두리. 멀수록 우주 색에 묻힌다.
 */
const ROCK_FRAG = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vObj;
  varying mat3 vRot;
  uniform vec3 uLight;
  uniform vec3 uStar;
  uniform float uStarPower;
  uniform vec3 uBase;
  uniform vec3 uRim;
  uniform vec3 uFog;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }
  float height(vec3 p) { return noise(p * 4.0) * 0.6 + noise(p * 10.0) * 0.4; }
  void main() {
    // 표면의 잔 울퉁불퉁함: 물체 좌표의 높낮이 기울기로 면 방향을 흔든다 (돌아도 무늬가 표면에 붙어 있다)
    float h0 = height(vObj);
    float e = 0.05;
    vec3 grad = vec3(height(vObj + vec3(e, 0.0, 0.0)) - h0, height(vObj + vec3(0.0, e, 0.0)) - h0, height(vObj + vec3(0.0, 0.0, e)) - h0) / e;
    vec3 n = normalize(normalize(vN) - normalize(vRot * grad) * min(length(grad), 3.0) * 0.12);
    vec3 v = normalize(cameraPosition - vW);
    vec3 base = uBase * (0.5 + 0.8 * h0);
    float key = max(dot(n, uLight), 0.0);
    vec3 toS = uStar - vW;
    float ds = length(toS);
    float star = max(dot(n, toS / max(ds, 0.001)), 0.0) * uStarPower / (1.0 + ds * ds * 0.015);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
    vec3 col = base * (0.08 + 0.8 * key) + vec3(0.85, 0.8, 1.0) * base * star * 2.2;
    col += uRim * fres * (0.45 + 1.1 * key + 0.6 * min(star, 1.0));
    float fog = smoothstep(45.0, 150.0, length(cameraPosition - vW));
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;

/** 씨앗값이 같으면 같은 값을 주는 3차원 값 잡음 (바위 모양 만들 때 한 번만 쓴다) */
function valueNoise3(x: number, y: number, z: number, seed: number) {
  const h = (i: number, j: number, k: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 13.13) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(ix, iy, iz), h(ix + 1, iy, iz), u), lerp(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), u), v),
    lerp(lerp(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), u), lerp(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), u), v),
    w,
  );
}

/**
 * 울퉁불퉁한 바위 모양: 정점을 합친 구를 여러 겹 잡음으로 부풀리고 깎는다 (부드러운 면 + 셰이더의 잔 울퉁불퉁함).
 * detail: 큰 바위는 촘촘하게(3), 작은 파편은 거칠게(1).
 */
function rockGeometry(seed: number, detail: number) {
  const ico = new IcosahedronGeometry(1, detail);
  ico.deleteAttribute("normal");
  ico.deleteAttribute("uv");
  const g = mergeVertices(ico);
  ico.dispose();
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // 큰 덩어리 + 중간 혹 + 패인 자국(잡음이 높은 곳을 깎음)
    const big = valueNoise3(x * 1.2, y * 1.2, z * 1.2, seed);
    const mid = valueNoise3(x * 3, y * 3, z * 3, seed + 7);
    const pit = Math.max(0, valueNoise3(x * 5, y * 5, z * 5, seed + 13) - 0.62);
    const d = 0.66 + 0.62 * big + 0.18 * mid - pit * 0.6;
    pos.setXYZ(i, x * d, y * d, z * d);
  }
  g.computeVertexNormals();
  return g;
}

function rockUniforms(base: string) {
  return {
    uLight: { value: LIGHT_DIR.clone() },
    uStar: { value: new Vector3() },
    uStarPower: { value: 1 },
    uBase: { value: new Color(base) },
    uRim: { value: new Color("#b9a2ff") },
    uFog: { value: new Color("#0b0a2e") },
  };
}

const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
const S = new Vector3();
const P = new Vector3();

type Rock = { pos: Vector3; scale: Vector3; rot: Euler; spin: Vector3 };

/**
 * 소행성 무리 (레퍼런스: 별똥별 옆을 지나가는 크고 작은 바위와 부서진 파편).
 * 세 경로의 여러 구간 옆(별똥별 길에서 7 이상 비켜)에 무리를 짓고, 큰 바위 둘레에 작은 파편이 흩어진다.
 * 저마다 천천히 돌고, 은하 쪽 빛·별똥별 빛을 받으며 테두리가 라벤더빛으로 빛난다. 한 번에 그리는 인스턴싱.
 */
export function AsteroidField({ paths, director, clock, count }: { paths: JourneyPaths; director: Director; clock: JourneyClock; count: number }) {
  const big = useRef<InstancedMesh>(null);
  const small = useRef<InstancedMesh>(null);
  const geoBig = useMemo(() => rockGeometry(3, 3), []);
  const geoSmall = useMemo(() => rockGeometry(11, 1), []);
  useEffect(
    () => () => {
      geoBig.dispose();
      geoSmall.dispose();
    },
    [geoBig, geoSmall],
  );
  const bigUniforms = useMemo(() => rockUniforms("#3a3268"), []);
  const smallUniforms = useMemo(() => rockUniforms("#35315f"), []);
  const fields = useMemo(() => {
    const bigCount = Math.round(count * 0.3);
    return { bigRocks: placeRocks(paths, bigCount, 3131, 0.5, 2.6, 6), smallRocks: placeRocks(paths, count - bigCount, 4242, 0.08, 0.55, 9) };
  }, [paths, count]);

  useEffect(() => {
    for (const [mesh, rocks] of [
      [big.current, fields.bigRocks],
      [small.current, fields.smallRocks],
    ] as const) {
      if (!mesh) continue;
      rocks.forEach((r, i) => {
        Q.setFromEuler(r.rot);
        M.compose(r.pos, Q, r.scale);
        mesh.setMatrixAt(i, M);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [fields]);

  useFrame(() => {
    const t = clock.time;
    for (const [mesh, rocks] of [
      [big.current, fields.bigRocks],
      [small.current, fields.smallRocks],
    ] as const) {
      if (!mesh) continue;
      rocks.forEach((r, i) => {
        E.set(r.rot.x + r.spin.x * t, r.rot.y + r.spin.y * t, r.rot.z + r.spin.z * t);
        Q.setFromEuler(E);
        M.compose(r.pos, Q, r.scale);
        mesh.setMatrixAt(i, M);
      });
      mesh.instanceMatrix.needsUpdate = true;
      const u = (mesh.material as ShaderMaterial).uniforms;
      (u.uStar.value as Vector3).copy(director.star);
      u.uStarPower.value = director.values.brightness;
    }
  });

  return (
    <group>
      <instancedMesh ref={big} args={[geoBig, undefined, fields.bigRocks.length]} frustumCulled={false}>
        <shaderMaterial vertexShader={ROCK_VERT} fragmentShader={ROCK_FRAG} uniforms={bigUniforms} />
      </instancedMesh>
      <instancedMesh ref={small} args={[geoSmall, undefined, fields.smallRocks.length]} frustumCulled={false}>
        <shaderMaterial vertexShader={ROCK_VERT} fragmentShader={ROCK_FRAG} uniforms={smallUniforms} />
      </instancedMesh>
    </group>
  );
}

/** 무리 지은 바위 배치: 경로 세 갈래의 여러 구간 옆에 무리 중심을 두고 그 둘레에 흩뿌린다 */
function placeRocks(paths: JourneyPaths, n: number, seed: number, minScale: number, maxScale: number, spread: number): Rock[] {
  const rand = mulberry32(seed);
  const center = new Vector3();
  const tan = new Vector3();
  const side = new Vector3();
  const up = new Vector3(0, 1, 0);
  // 무리 중심: (경로, 진행률, 옆 방향)
  const clusters: Array<[keyof Pick<JourneyPaths, "a" | "b" | "c">, number, number]> = [
    ["a", 0.13, 1],
    ["a", 0.24, -1],
    ["b", 0.34, 1],
    ["b", 0.46, -1],
    ["c", 0.58, 1],
    ["c", 0.7, -1],
    ["a", 0.66, 1],
    ["b", 0.86, -1],
  ];
  return Array.from({ length: n }, (_, i) => {
    const [curve, u0, dir] = clusters[i % clusters.length];
    const u = u0 + (rand() - 0.5) * 0.05;
    paths[curve].getPointAt(((u % 1) + 1) % 1, center);
    paths[curve].getTangentAt(((u % 1) + 1) % 1, tan);
    side.crossVectors(tan, up).normalize();
    const off = dir * (9 + Math.abs(gaussian(rand)) * spread);
    const pos = center.clone().addScaledVector(side, off).addScaledVector(up, gaussian(rand) * spread * 0.45).addScaledVector(tan, gaussian(rand) * spread);
    const s = minScale + Math.pow(rand(), 2.2) * (maxScale - minScale);
    return {
      pos,
      scale: new Vector3(s * (0.7 + rand() * 0.7), s * (0.5 + rand() * 0.4), s * (0.8 + rand() * 0.5)),
      rot: new Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
      spin: new Vector3((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5),
    };
  });
}

const DEBRIS_BOX = 36;

/**
 * 카메라 곁을 스치는 작은 파편: 카메라를 감싼 상자(한 변 36) 안에 고정돼 있어, 가까이서 빠르게 지나간다 (가장 빠른 시차 층).
 * 카메라가 지나가면 반대편에서 다시 나타나고, 너무 가깝거나 상자 가장자리에서는 작아져 사라진다.
 */
export function NearDebris({ director, clock, count }: { director: Director; clock: JourneyClock; count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => rockGeometry(23, 1), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const uniforms = useMemo(() => rockUniforms("#4a4280"), []);
  const items = useMemo(() => {
    const rand = mulberry32(9191);
    return Array.from({ length: count }, () => ({
      base: new Vector3(rand() * DEBRIS_BOX, rand() * DEBRIS_BOX, rand() * DEBRIS_BOX),
      size: 0.04 + Math.pow(rand(), 2) * 0.32,
      rot: new Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
      spin: new Vector3((rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6),
    }));
  }, [count]);

  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.time;
    const half = DEBRIS_BOX / 2;
    items.forEach((it, i) => {
      P.set(
        wrap(it.base.x - camera.position.x + half, DEBRIS_BOX) - half,
        wrap(it.base.y - camera.position.y + half, DEBRIS_BOX) - half,
        wrap(it.base.z - camera.position.z + half, DEBRIS_BOX) - half,
      );
      const d = P.length();
      const k = smooth(1.2, 3, d) * (1 - smooth(0.32 * DEBRIS_BOX, 0.5 * DEBRIS_BOX, d));
      P.add(camera.position);
      E.set(it.rot.x + it.spin.x * t, it.rot.y + it.spin.y * t, it.rot.z + it.spin.z * t);
      Q.setFromEuler(E);
      S.setScalar(Math.max(1e-4, it.size * k));
      M.compose(P, Q, S);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
    const u = (m.material as ShaderMaterial).uniforms;
    (u.uStar.value as Vector3).copy(director.star);
    u.uStarPower.value = director.values.brightness;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false}>
      <shaderMaterial vertexShader={ROCK_VERT} fragmentShader={ROCK_FRAG} uniforms={uniforms} />
    </instancedMesh>
  );
}
