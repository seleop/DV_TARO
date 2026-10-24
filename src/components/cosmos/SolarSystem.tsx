"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, Vector3, type Group, type Mesh, type ShaderMaterial } from "three";
import type { JourneyClock } from "./common";
import { LIGHT_DIR } from "./Planets";
import type { JourneyPaths } from "./stages";

/**
 * 태양계 행성 (2026-10-24 사용자 요청: 우리가 익숙한 행성이 지나가도록, 기본값: 실제 모습에 가깝게).
 * 사진 없이 셰이더로 색·무늬를 계산한다:
 *  지구(바다·대륙·극지방 얼음·흐르는 구름·푸른 대기) · 달(바다·크레이터) · 화성(붉은 사막·극관) · 금성(노란 구름 소용돌이)
 *  목성(줄무늬·대적점) · 토성(옅은 줄무늬 + 카시니 틈이 있는 고리, 고리에 행성 그림자) · 해왕성(푸른 줄무늬·검은 점)
 * 유람 경로의 여러 구간 옆에 놓아 가입하는 동안 차례로 지나가고, 저마다 천천히 자전한다.
 * 한 화면에 한 행성만 보이도록 셋(지구·토성·화성)만 경로 위에 멀리 띄엄띄엄 둔다 (2026-10-24 사용자 의견: 너무 많음).
 * 밝기는 우주 배경에 섞이도록 낮추고, 멀수록 우주 색에 묻히며, 빛 받지 않는 쪽은 보랏빛 어둠으로 (너무 밝아 이질적이라는 의견)
 */
export const SOLAR_KIND = { earth: 0, mars: 1, jupiter: 2, saturn: 3, neptune: 4, moon: 5, venus: 6 } as const;
export type SolarKind = keyof typeof SOLAR_KIND;

export const SOLAR_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObj;
  varying float vDist;
  void main() {
    vObj = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDist = distance(cameraPosition, world.xyz);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const SOLAR_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vObj;
  varying float vDist;
  uniform vec3 uLight;
  uniform float uKind;
  uniform float uTime;
  uniform vec3 uAtmo;
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
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return v;
  }
  vec3 surface(vec3 p) {
    float lat = p.y;
    if (uKind < 0.5) {
      // 지구: 바다·대륙·사막·극지방 얼음·구름
      float n = fbm(p * 2.2 + 3.1);
      float land = smoothstep(0.5, 0.53, n);
      vec3 ocean = mix(vec3(0.02, 0.1, 0.34), vec3(0.05, 0.28, 0.58), fbm(p * 6.0));
      vec3 ground = mix(vec3(0.2, 0.4, 0.16), vec3(0.58, 0.48, 0.3), smoothstep(0.56, 0.68, n));
      vec3 c = mix(ocean, ground, land);
      c = mix(c, vec3(0.94, 0.96, 1.0), smoothstep(0.8, 0.88, abs(lat)));
      float cl = smoothstep(0.52, 0.72, fbm(p * 3.4 + vec3(uTime * 0.012, 0.0, 0.0)));
      return mix(c, vec3(1.0), cl * 0.85);
    }
    if (uKind < 1.5) {
      // 화성: 붉은 사막과 어두운 지대, 북극의 얼음
      float n = fbm(p * 3.0);
      vec3 c = mix(vec3(0.78, 0.34, 0.15), vec3(0.42, 0.17, 0.1), smoothstep(0.45, 0.66, n));
      return mix(c, vec3(0.96, 0.93, 0.9), smoothstep(0.86, 0.92, lat));
    }
    if (uKind < 2.5) {
      // 목성: 크림·황갈색 줄무늬 + 대적점
      float w = fbm(p * vec3(2.0, 7.0, 2.0)) * 0.35;
      float b = sin((lat + w) * 22.0);
      vec3 c = mix(vec3(0.88, 0.79, 0.64), vec3(0.66, 0.46, 0.32), smoothstep(-0.3, 0.6, b));
      c = mix(c, vec3(0.95, 0.9, 0.8), smoothstep(0.7, 1.0, sin((lat + w) * 9.0)) * 0.5);
      vec2 q = vec2(atan(p.z, p.x) - 0.6, (lat + 0.33) * 2.6);
      float sd = length(q * vec2(1.0, 1.7));
      return mix(c, vec3(0.78, 0.33, 0.22), 1.0 - smoothstep(0.16, 0.3, sd));
    }
    if (uKind < 3.5) {
      // 토성: 옅은 금빛 줄무늬
      float w = fbm(p * vec3(2.0, 6.0, 2.0)) * 0.15;
      float b = sin((lat + w) * 30.0);
      return mix(vec3(0.9, 0.81, 0.6), vec3(0.76, 0.64, 0.42), smoothstep(-0.5, 0.8, b) * 0.6);
    }
    if (uKind < 4.5) {
      // 해왕성: 푸른 줄무늬와 검은 점
      float w = fbm(p * vec3(2.0, 5.0, 2.0)) * 0.2;
      vec3 c = mix(vec3(0.16, 0.3, 0.8), vec3(0.34, 0.55, 0.96), smoothstep(-0.3, 0.8, sin((lat + w) * 14.0)));
      vec2 q = vec2(atan(p.z, p.x) + 1.2, (lat + 0.25) * 3.0);
      return mix(c, vec3(0.08, 0.14, 0.42), (1.0 - smoothstep(0.12, 0.22, length(q))) * 0.8);
    }
    if (uKind < 5.5) {
      // 달: 회색 바탕, 어두운 바다, 작은 크레이터
      float n = fbm(p * 4.0);
      vec3 c = vec3(0.62) * (0.78 + 0.32 * n);
      c *= 1.0 - 0.32 * smoothstep(0.52, 0.62, fbm(p * 1.7 + 5.0));
      float cr = smoothstep(0.62, 0.66, noise(p * 14.0));
      return c * (1.0 - cr * 0.25);
    }
    // 금성: 노란 구름 소용돌이
    float s = fbm(p * 3.0 + fbm(p * 2.0 + uTime * 0.01));
    return mix(vec3(0.95, 0.83, 0.58), vec3(0.82, 0.62, 0.38), s);
  }
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    // 빛을 보는 쪽으로 당겨 빛 받는 면이 보이게 하되(반달 이상), 밝기는 우주 배경에 맞게 낮춘다
    vec3 l = normalize(uLight * 0.5 + v);
    float diff = max(dot(n, l), 0.0);
    vec3 base = surface(normalize(vObj));
    // 채도를 살짝 낮춰 보랏빛 우주와 어울리게
    base = mix(base, vec3(dot(base, vec3(0.3, 0.59, 0.11))), 0.18);
    vec3 col = base * (0.04 + 0.72 * pow(diff, 1.25));
    // 빛 받지 않는 쪽은 우주의 보랏빛이 살짝 비친다
    col += vec3(0.05, 0.035, 0.12) * (1.0 - diff);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.8);
    col += uAtmo * fres * (0.12 + 0.45 * diff);
    // 멀수록 우주 색에 묻힌다
    float fog = smoothstep(50.0, 170.0, vDist);
    gl_FragColor = vec4(mix(col, uFog, fog * 0.7), 1.0);
  }
`;

const RING_VERT = /* glsl */ `
  varying float vR;
  varying vec3 vW;
  void main() {
    vR = length(position.xy);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/** 토성 고리: 가는 띠 무늬·카시니 틈, 행성이 빛을 가리는 곳은 그림자 */
const RING_FRAG = /* glsl */ `
  varying float vR;
  varying vec3 vW;
  uniform float uInner;
  uniform float uOuter;
  uniform vec3 uLight;
  uniform vec3 uCenter;
  uniform float uRadius;
  void main() {
    float t = (vR - uInner) / (uOuter - uInner);
    float bands = 0.62 + 0.22 * sin(t * 40.0) + 0.16 * sin(t * 13.0 + 1.3);
    float a = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t)) * (0.35 + 0.6 * bands);
    a *= smoothstep(0.012, 0.035, abs(t - 0.62));
    vec3 col = mix(vec3(0.72, 0.64, 0.5), vec3(0.96, 0.9, 0.78), bands);
    vec3 oc = vW - uCenter;
    float b = dot(oc, uLight);
    float c = dot(oc, oc) - uRadius * uRadius;
    float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.3 : 1.0;
    gl_FragColor = vec4(col * shadow * 0.75, a * 0.7);
  }
`;

const ATMO: Record<SolarKind, string> = {
  earth: "#6fb4ff",
  mars: "#ff9a6a",
  jupiter: "#e8cfa0",
  saturn: "#f2dfa8",
  neptune: "#7fd8ff",
  moon: "#b8b8c8",
  venus: "#ffe0a0",
};

export function solarUniforms(kind: SolarKind, light: Vector3 = LIGHT_DIR) {
  return {
    uLight: { value: light.clone() },
    uKind: { value: SOLAR_KIND[kind] },
    uTime: { value: 0 },
    uAtmo: { value: new Color(ATMO[kind]) },
    uFog: { value: new Color("#0b0a2e") },
  };
}

type Spec = { kind: SolarKind; u: number; fwd: number; side: number; up: number; radius: number; tilt: number; spin: number; moon?: boolean; ring?: boolean };

/**
 * 경로(기본 경로 A)의 진행률 u 지점(카메라가 그 행성을 정면으로 보게 되는 곳)의 앞쪽(fwd)·옆(side)·위(up)에 둔다. 차례로 다가와 지나간다.
 * 세로 화면은 가로 시야가 좁아(반각 약 16°) 옆으로는 조금만(약 10° 안쪽) 비키고, 화면 위쪽에 걸리게 조금 높이 둔다
 */
const SPECS: Spec[] = [
  { kind: "earth", u: 0.14, fwd: 46, side: -9, up: 9, radius: 4.2, tilt: 0.41, spin: 0.08, moon: true },
  { kind: "saturn", u: 0.47, fwd: 75, side: -14, up: 16, radius: 6.5, tilt: 0.47, spin: 0.1, ring: true },
  { kind: "mars", u: 0.8, fwd: 40, side: 8, up: 7, radius: 3.4, tilt: 0.44, spin: 0.07 },
];

const TMP_T = new Vector3();
const TMP_S = new Vector3();
const UP = new Vector3(0, 1, 0);

export function SolarPlanets({ paths, clock }: { paths: JourneyPaths; clock: JourneyClock }) {
  const items = useMemo(
    () =>
      SPECS.map((s) => {
        const p = paths.a.getPointAt(s.u, new Vector3());
        paths.a.getTangentAt(s.u, TMP_T);
        TMP_S.crossVectors(TMP_T, UP).normalize();
        p.addScaledVector(TMP_T, s.fwd).addScaledVector(TMP_S, s.side).addScaledVector(UP, s.up);
        return { ...s, position: p.toArray() as [number, number, number], uniforms: solarUniforms(s.kind), moonUniforms: s.moon ? solarUniforms("moon") : null };
      }),
    [paths],
  );
  const ringUniforms = useMemo(() => {
    const sat = items.find((i) => i.ring);
    if (!sat) return null;
    return {
      uInner: { value: 1.3 },
      uOuter: { value: 2.3 },
      uLight: { value: LIGHT_DIR.clone() },
      uCenter: { value: new Vector3(...sat.position) },
      uRadius: { value: sat.radius },
    };
  }, [items]);
  const bodies = useRef<Array<Mesh | null>>([]);
  const moons = useRef<Array<Group | null>>([]);

  useFrame(() => {
    const t = clock.time;
    items.forEach((it, i) => {
      const m = bodies.current[i];
      if (m) {
        m.rotation.y = t * it.spin;
        (m.material as ShaderMaterial).uniforms.uTime.value = t;
      }
      const g = moons.current[i];
      // 달은 지구 둘레를 천천히 돈다
      if (g) g.rotation.y = t * 0.06;
    });
  });

  return (
    <group>
      {items.map((it, i) => (
        <group key={it.kind} position={it.position} rotation={[0, 0, it.tilt]}>
          <mesh
            ref={(el) => {
              bodies.current[i] = el;
            }}
            scale={it.radius}
          >
            <sphereGeometry args={[1, 64, 40]} />
            <shaderMaterial vertexShader={SOLAR_VERT} fragmentShader={SOLAR_FRAG} uniforms={it.uniforms} />
          </mesh>
          {it.ring && ringUniforms && (
            // 고리는 적도면(행성 좌표 XZ)에. 기하는 XY 평면이라 눕힌다
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={it.radius} renderOrder={1}>
              <ringGeometry args={[1.3, 2.3, 128, 1]} />
              <shaderMaterial vertexShader={RING_VERT} fragmentShader={RING_FRAG} uniforms={ringUniforms} transparent depthWrite={false} side={DoubleSide} />
            </mesh>
          )}
          {it.moonUniforms && (
            <group
              ref={(el) => {
                moons.current[i] = el;
              }}
            >
              <mesh position={[it.radius * 2.8, it.radius * 0.3, 0]} scale={it.radius * 0.27}>
                <sphereGeometry args={[1, 32, 20]} />
                <shaderMaterial vertexShader={SOLAR_VERT} fragmentShader={SOLAR_FRAG} uniforms={it.moonUniforms} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
