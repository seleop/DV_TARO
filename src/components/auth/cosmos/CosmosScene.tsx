"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  ShaderMaterial,
  SpriteMaterial,
  Vector3,
  type Group,
  type Mesh,
  type Points,
  type Sprite,
} from "three";
import { constellationPoints, cosmosBudget, mulberry32 } from "./layout";

/**
 * 회원가입 3D 우주 (보라·남색 성운 + 반짝이는 별 + 나선 은하 + 단계별 별자리).
 * - 가입 단계(step)마다 별이 하나씩 켜지며 선으로 이어지고, 카메라가 조금씩 하늘로 올라간다
 * - 손가락(마우스)을 움직이면 카메라가 살짝 기울어 입체감이 난다
 * - 가입이 끝나면(done) 별자리 전체가 밝게 빛나고 카메라가 물러난다
 * SignupCosmos가 지연 로딩한다. 실패·미지원이면 SignupCosmos가 SVG 별자리로 대신한다.
 */
export type CosmosSceneProps = {
  /** false면 그리기를 멈춘다 (가입 화면이 아닐 때·탭이 숨겨졌을 때) */
  running: boolean;
  total: number;
  step: number;
  done: boolean;
  onReady?: () => void;
  onContextLost?: () => void;
};

export default function CosmosScene({ running, total, step, done, onReady, onContextLost }: CosmosSceneProps) {
  const budget = useMemo(() => cosmosBudget(), []);
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, budget.maxDpr]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: 50, near: 0.1, far: 80, position: [0, 0.6, 8] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onContextLost?.();
          },
          { once: true },
        );
        onReady?.();
      }}
    >
      <Nebula />
      <StarField count={budget.stars} />
      <Galaxy count={budget.galaxy} />
      <ConstellationStars total={total} step={step} done={done} />
      <ShootingStar />
      <CameraRig step={step} total={total} done={done} />
    </Canvas>
  );
}

/* ── 공용 ─────────────────────────────────────────── */

/** 부드러운 원형 빛 (별·빛무리용) */
function useGlowTexture() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.18, "rgba(255,246,220,0.9)");
    grd.addColorStop(0.45, "rgba(216,180,254,0.35)");
    grd.addColorStop(1, "rgba(216,180,254,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** 장면 요소(ref)에 붙은 셰이더의 시간 값을 흘려보낸다 (훅이 만든 값을 직접 바꾸지 않도록 ref로 접근) */
function tick(obj: Mesh | Points | null, dt: number) {
  const m = obj?.material as ShaderMaterial | undefined;
  if (m?.uniforms?.uTime) m.uniforms.uTime.value += dt;
}

/** 손가락·마우스 위치(-1~1). 입력칸 위를 누를 때도 막지 않도록 창 전체에서 듣기만 한다 */
function usePointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", on, { passive: true });
    window.addEventListener("pointerdown", on, { passive: true });
    return () => {
      window.removeEventListener("pointermove", on);
      window.removeEventListener("pointerdown", on);
    };
  }, []);
  return p;
}

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  uniform float uScale;
  varying vec3 vColor;
  varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vBright = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.7 + aPhase), uTwinkle);
    vColor = aColor;
    // 멀리 있어도 점이 사라지지 않게 최소 크기를 둔다
    gl_PointSize = max(1.5, aSize * uPixelRatio * (uScale / -mv.z));
  }
`;
const POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    // smoothstep(큰 값, 작은 값)은 GLSL 규격상 결과가 정해져 있지 않아(일부 기기에서 0) 뒤집어 쓴다
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    a *= a;
    gl_FragColor = vec4(vColor * a * vBright, a * vBright);
  }
`;

/** twinkle: 반짝임 정도(0~1), scale: 거리 대비 점 크기 */
function pointsMaterial(twinkle: number, scale: number) {
  return new ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }, uTwinkle: { value: twinkle }, uScale: { value: scale } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/* ── 성운 ─────────────────────────────────────────── */

const NEBULA_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 p = vUv * vec2(3.0, 2.2);
    float t = uTime * 0.02;
    float n = fbm(p + vec2(t, -t * 0.6));
    float m = fbm(p * 1.7 - vec2(t * 0.8, t) + n);
    vec3 navy = vec3(0.12, 0.14, 0.55);
    vec3 purple = vec3(0.62, 0.28, 0.95);
    vec3 pink = vec3(0.95, 0.4, 0.78);
    vec3 col = mix(navy, purple, smoothstep(0.35, 0.7, n));
    col = mix(col, pink, smoothstep(0.5, 0.8, m) * 0.55);
    // 구름 덩어리가 또렷하게 보이도록 대비를 준다
    float a = pow(smoothstep(0.2, 0.75, n * m * 2.0), 1.4) * 0.9;
    vec2 c = vUv - 0.5;
    a *= 1.0 - smoothstep(0.3, 0.55, length(c * vec2(1.0, 1.25)));
    gl_FragColor = vec4(col * a, a);
  }
`;

function Nebula() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: NEBULA_FRAG,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  const mesh = useRef<Mesh>(null);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => tick(mesh.current, dt));
  return (
    <mesh ref={mesh} position={[0, 2.5, -12]} rotation={[0, 0, -0.35]} material={mat}>
      <planeGeometry args={[30, 26]} />
    </mesh>
  );
}

/* ── 반짝이는 별 ──────────────────────────────────── */

function StarField({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const rand = mulberry32(7);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const palette = [new Color("#ffffff"), new Color("#e9d5ff"), new Color("#c7d2fe"), new Color("#fbcfe8")];
    for (let i = 0; i < count; i++) {
      // 카메라 앞쪽 반구 껍질에 흩뿌린다
      const r = 10 + rand() * 18;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(rand() * 1.6 - 0.8);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) + 3;
      pos[i * 3 + 2] = -Math.abs(r * Math.sin(ph) * Math.sin(th)) - 2;
      size[i] = rand() < 0.07 ? 2.6 + rand() * 1.6 : 0.8 + rand() * 1.1;
      phase[i] = rand() * Math.PI * 2;
      const c = palette[Math.floor(rand() * palette.length)];
      color.set([c.r, c.g, c.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSize", new BufferAttribute(size, 1));
    g.setAttribute("aPhase", new BufferAttribute(phase, 1));
    g.setAttribute("aColor", new BufferAttribute(color, 3));
    return { geo: g, mat: pointsMaterial(1, 70) };
  }, [count]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const pts = useRef<Points>(null);
  useFrame((_, dt) => tick(pts.current, dt));
  return <points ref={pts} geometry={geo} material={mat} />;
}

/* ── 나선 은하 ────────────────────────────────────── */

function Galaxy({ count }: { count: number }) {
  const ref = useRef<Group>(null);
  const { geo, mat } = useMemo(() => {
    const rand = mulberry32(19);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const inner = new Color("#fde7ff");
    const outer = new Color("#5b5bd6");
    const tmp = new Color();
    const ARMS = 3;
    for (let i = 0; i < count; i++) {
      const r = Math.pow(rand(), 1.7) * 5;
      const arm = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spin = r * 1.25;
      const jitter = (rand() - 0.5) * (0.35 + r * 0.12);
      pos[i * 3] = Math.cos(arm + spin) * r + jitter;
      pos[i * 3 + 1] = (rand() - 0.5) * 0.3 * (1 - r / 6);
      pos[i * 3 + 2] = Math.sin(arm + spin) * r + (rand() - 0.5) * (0.35 + r * 0.12);
      size[i] = 0.6 + rand() * 0.9;
      phase[i] = rand() * Math.PI * 2;
      tmp.copy(inner).lerp(outer, Math.min(1, r / 4.2));
      if (rand() < 0.12) tmp.lerp(new Color("#f472b6"), 0.6);
      color.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSize", new BufferAttribute(size, 1));
    g.setAttribute("aPhase", new BufferAttribute(phase, 1));
    g.setAttribute("aColor", new BufferAttribute(color, 3));
    return { geo: g, mat: pointsMaterial(0.35, 42) };
  }, [count]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const pts = useRef<Points>(null);
  useFrame((_, dt) => {
    tick(pts.current, dt);
    if (ref.current) ref.current.rotation.y += dt * 0.035;
  });
  return (
    <group position={[2.2, 3.6, -9]} rotation={[1.05, 0, 0.45]}>
      <group ref={ref}>
        <points ref={pts} geometry={geo} material={mat} />
      </group>
    </group>
  );
}

/* ── 단계별 별자리 ────────────────────────────────── */

function ConstellationStars({ total, step, done }: { total: number; step: number; done: boolean }) {
  const glow = useGlowTexture();
  const pts = useMemo(() => constellationPoints(total).map(([x, y, z]) => new Vector3(x, y, z)), [total]);
  const sprites = useRef<Array<Sprite | null>>([]);
  const rings = useRef<Array<Sprite | null>>([]);
  // 새로 켜진 별의 빛 고리 (켜진 시각)
  const burst = useRef<{ idx: number; t: number } | null>(null);
  const prevLit = useRef(step);

  // 선: 이어진 선(밝음) + 앞으로 이어질 안내선(흐린 점선)
  const lines = useMemo(() => {
    return pts.slice(1).map((b, i) => {
      const a = pts[i];
      const geo = new BufferGeometry().setFromPoints([a, a.clone()]);
      const line = new Line(geo, new LineBasicMaterial({ color: "#ffe9a8", transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
      const guideGeo = new BufferGeometry().setFromPoints([a, b]);
      const guide = new Line(guideGeo, new LineDashedMaterial({ color: "#cfc8ff", dashSize: 0.08, gapSize: 0.12, transparent: true, opacity: 0.28, depthWrite: false }));
      guide.computeLineDistances();
      return { line, guide, a, b, p: 0 };
    });
  }, [pts]);
  useEffect(
    () => () =>
      lines.forEach(({ line, guide }) => {
        line.geometry.dispose();
        (line.material as LineBasicMaterial).dispose();
        guide.geometry.dispose();
        (guide.material as LineDashedMaterial).dispose();
      }),
    [lines],
  );

  const spriteMats = useMemo(
    () => pts.map(() => new SpriteMaterial({ map: glow, color: "#fff6dc", transparent: true, depthWrite: false, blending: AdditiveBlending })),
    [pts, glow],
  );
  const ringMats = useMemo(
    () => pts.map(() => new SpriteMaterial({ map: glow, color: "#d8b4fe", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })),
    [pts, glow],
  );
  useEffect(
    () => () => {
      spriteMats.forEach((m) => m.dispose());
      ringMats.forEach((m) => m.dispose());
    },
    [spriteMats, ringMats],
  );

  const tmp = useMemo(() => new Vector3(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const lit = done ? total : step;
    if (lit > prevLit.current && lit > 0) burst.current = { idx: Math.min(lit - 1, total - 1), t };
    prevLit.current = lit;

    pts.forEach((_, i) => {
      const s = sprites.current[i];
      if (!s) return;
      const on = done || i < step;
      const cur = !done && i === step;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      const target = done ? 0.95 + 0.15 * pulse : on ? 0.62 : cur ? 0.45 + 0.12 * pulse : 0.2;
      s.scale.setScalar(s.scale.x + (target - s.scale.x) * Math.min(1, dt * 6));
      spriteMats[i].opacity = on || cur ? 1 : 0.45;
    });

    // 새로 켜진 별에서 퍼지는 빛 고리
    rings.current.forEach((r, i) => {
      if (!r) return;
      const b = burst.current;
      if (b && b.idx === i) {
        const k = (t - b.t) / 0.9;
        r.scale.setScalar(0.4 + k * 2.2);
        ringMats[i].opacity = Math.max(0, 0.9 * (1 - k));
      } else ringMats[i].opacity = 0;
    });

    // 선은 이어질 때 앞으로 그려진다
    lines.forEach((l, i) => {
      const on = done || i + 1 < step;
      l.p += ((on ? 1 : 0) - l.p) * Math.min(1, dt * 3.5);
      tmp.copy(l.a).lerp(l.b, l.p);
      const attr = l.line.geometry.getAttribute("position") as BufferAttribute;
      attr.setXYZ(1, tmp.x, tmp.y, tmp.z);
      attr.needsUpdate = true;
      l.line.visible = l.p > 0.01;
    });
  });

  return (
    <group>
      {lines.map((l, i) => (
        <group key={i}>
          <primitive object={l.guide} />
          <primitive object={l.line} />
        </group>
      ))}
      {pts.map((p, i) => (
        <group key={i} position={p}>
          <sprite
            ref={(el) => {
              rings.current[i] = el;
            }}
            material={ringMats[i]}
          />
          <sprite
            ref={(el) => {
              sprites.current[i] = el;
            }}
            material={spriteMats[i]}
            scale={0.2}
          />
        </group>
      ))}
    </group>
  );
}

/* ── 별똥별 ───────────────────────────────────────── */

function ShootingStar() {
  const line = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(6), 3));
    geo.setAttribute("color", new BufferAttribute(new Float32Array([1, 1, 1, 0.35, 0.2, 0.6]), 3));
    return new Line(geo, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  }, []);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as LineBasicMaterial).dispose();
    },
    [line],
  );
  const s = useRef({ next: 2.5, start: -10, from: new Vector3(), dir: new Vector3(), rand: mulberry32(31) });
  const obj = useRef<Line>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = s.current;
    const ln = obj.current;
    if (!ln) return;
    const rand = m.rand;
    if (t > m.next) {
      m.start = t;
      m.next = t + 4 + rand() * 6;
      m.from.set(-4 + rand() * 6, 4 + rand() * 2.5, -6 - rand() * 3);
      m.dir.set(2.8 + rand(), -1.4 - rand() * 0.6, 0);
    }
    const k = (t - m.start) / 0.9;
    const mat = ln.material as LineBasicMaterial;
    if (k < 0 || k > 1) {
      mat.opacity = 0;
      return;
    }
    const head = m.from.clone().addScaledVector(m.dir, k);
    const tail = head.clone().addScaledVector(m.dir, -0.35);
    const attr = ln.geometry.getAttribute("position") as BufferAttribute;
    attr.setXYZ(0, head.x, head.y, head.z);
    attr.setXYZ(1, tail.x, tail.y, tail.z);
    attr.needsUpdate = true;
    mat.opacity = Math.sin(k * Math.PI) * 0.9;
  });
  return <primitive ref={obj} object={line} />;
}

/* ── 카메라 ───────────────────────────────────────── */

function CameraRig({ step, total, done }: { step: number; total: number; done: boolean }) {
  const pointer = usePointer();
  const look = useMemo(() => new Vector3(), []);
  useFrame((state, dt) => {
    const cam = state.camera;
    // 단계가 오를수록 하늘로 조금씩 올라가고, 끝나면 별자리 전체가 보이게 물러난다
    const rise = (Math.min(step, total) / Math.max(1, total)) * 0.9;
    const tx = pointer.current.x * 0.6;
    const ty = 0.6 + rise + pointer.current.y * 0.35;
    const tz = done ? 9.6 : 8;
    const k = Math.min(1, dt * 2.2);
    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (ty - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;
    // 시선을 별자리보다 아래에 두어 별자리가 무대 위쪽(말풍선·별이와 겹치지 않는 곳)에 보이게 한다
    look.set(0, 0.55 + rise * 0.6, 0);
    cam.lookAt(look);
  });
  return null;
}
