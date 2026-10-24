"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Euler, Matrix4, Quaternion, Vector3, type InstancedMesh, type PointLight } from "three";
import type { JourneyClock } from "./common";
import { mulberry32 } from "./journey";
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
    float diff = max(dot(n, uLight), 0.0);
    vec3 p = normalize(vObj);
    float band = 0.5 + 0.5 * sin(p.y * 9.0 + sin(p.x * 4.0 + p.z * 3.0) * 1.6);
    vec3 base = mix(uColorA, uColorB, band);
    vec3 lit = base * (0.08 + 1.05 * diff);
    float fres = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.0);
    vec3 rim = uRim * fres * (0.35 + 0.9 * diff);
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

/* ── 소행성 ───────────────────────────────────────── */

const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();

type Rock = { pos: Vector3; scale: Vector3; rot: Euler; spin: Vector3 };

/**
 * 소행성 무리: 경로 두 구간 옆에 모여 있고 저마다 천천히 돈다 (한 번에 그리는 인스턴싱, 한 프레임 행렬 갱신만).
 * 별똥별을 따라다니는 빛을 받아 가까이 지날 때 밝아진다.
 */
export function AsteroidField({ paths, director, clock, count }: { paths: JourneyPaths; director: Director; clock: JourneyClock; count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const light = useRef<PointLight>(null);
  const rocks = useMemo<Rock[]>(() => {
    const rand = mulberry32(3131);
    const tan = new Vector3();
    const side = new Vector3();
    const up = new Vector3(0, 1, 0);
    return Array.from({ length: count }, (_, i) => {
      // 기본 경로·다른 곡선 경로의 두 구간 옆에 무리 짓는다
      const curve = i % 2 === 0 ? paths.a : paths.b;
      const u = (i % 4 < 2 ? 0.12 : 0.62) + rand() * 0.14;
      const pos = curve.getPointAt(u, new Vector3());
      curve.getTangentAt(u, tan);
      side.crossVectors(tan, up).normalize();
      const off = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 16);
      pos.addScaledVector(side, off).addScaledVector(up, (rand() - 0.5) * 12);
      const s = 0.25 + Math.pow(rand(), 2.4) * 1.7;
      return {
        pos,
        scale: new Vector3(s * (0.8 + rand() * 0.5), s * (0.6 + rand() * 0.4), s * (0.8 + rand() * 0.5)),
        rot: new Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
        spin: new Vector3((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3),
      };
    });
  }, [paths, count]);

  // 처음 한 번 자리 잡기
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    rocks.forEach((r, i) => {
      Q.setFromEuler(r.rot);
      M.compose(r.pos, Q, r.scale);
      m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [rocks]);

  useFrame(() => {
    const m = mesh.current;
    if (m) {
      const t = clock.time;
      rocks.forEach((r, i) => {
        E.set(r.rot.x + r.spin.x * t, r.rot.y + r.spin.y * t, r.rot.z + r.spin.z * t);
        Q.setFromEuler(E);
        M.compose(r.pos, Q, r.scale);
        m.setMatrixAt(i, M);
      });
      m.instanceMatrix.needsUpdate = true;
    }
    // 별똥별을 따라다니는 빛
    if (light.current) light.current.position.copy(director.star);
  });

  return (
    <group>
      <ambientLight color="#4a3fa0" intensity={0.55} />
      <directionalLight color="#c4b4ff" intensity={1.6} position={[LIGHT_DIR.x * 100, LIGHT_DIR.y * 100, LIGHT_DIR.z * 100]} />
      <pointLight ref={light} color="#d6caff" intensity={90} distance={34} decay={2} />
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#3a3170" roughness={0.95} metalness={0} flatShading emissive="#120d30" />
      </instancedMesh>
    </group>
  );
}
