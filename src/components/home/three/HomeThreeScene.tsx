"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, SRGBColorSpace, type Group, type Texture } from "three";

/**
 * 홈 3D 밤하늘 장면 (HomeThreeBackdrop 이 브라우저에서만 지연 로딩한다).
 *  - galaxy: 천천히 도는 나선 은하 입자
 *  - cards: 우주에 떠서 천천히 도는 타로 카드
 *  - orrery: 금빛 고리가 겹쳐 도는 천구의와 빛나는 구슬
 * 빛 계산 없는 재질(MeshBasic·Points)만 써서 가볍게 그리고, 화질 배율은 1.5배까지만 쓴다.
 * 주인공(은하·카드·천구의)은 화면 위쪽에 두어 아래쪽에 서는 별이와 겹치지 않게 한다.
 */
export type HomeThreeVariant = "galaxy" | "cards" | "orrery";

export default function HomeThreeScene({
  variant,
  running,
  moving,
  onReady,
  onContextLost,
}: {
  variant: HomeThreeVariant;
  running: boolean;
  moving: boolean;
  onReady: () => void;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ position: [0, 0, 10], fov: 50 }}
      frameloop={running ? (moving ? "always" : "demand") : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "default" }}
      onCreated={({ gl, scene }) => {
        scene.background = new Color("#05061f");
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
      }}
    >
      <FirstFrame onReady={onReady} />
      <StarField />
      {variant === "galaxy" && <Galaxy moving={moving} />}
      {variant === "cards" && <FloatingCards moving={moving} />}
      {variant === "orrery" && <Orrery moving={moving} />}
    </Canvas>
  );
}

/** 첫 화면을 그린 뒤 알린다 (그때부터 서서히 나타남) */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

/* ───────── 공용: 부드러운 빛 점 텍스처·씨앗 난수·먼 별 ───────── */

function useGlowTexture(stops: string[] = ["rgba(255,255,255,1)", "rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]) {
  const key = stops.join("|");
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    key.split("|").forEach((s, i, all) => grd.addColorStop(i / (all.length - 1), s));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [key]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function StarField() {
  const glow = useGlowTexture();
  const positions = useMemo(() => {
    const r = rng(20261025);
    const n = 900;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // 카메라 뒤쪽 넓은 판에 흩뿌린다 (세로 화면을 넉넉히 덮게)
      a[i * 3] = (r() - 0.5) * 34;
      a[i * 3 + 1] = (r() - 0.5) * 44;
      a[i * 3 + 2] = -12 - r() * 18;
    }
    return a;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.22} map={glow} transparent depthWrite={false} blending={AdditiveBlending} color="#dcd4ff" opacity={0.9} />
    </points>
  );
}

/** 크고 은은한 빛 (성운·후광) */
function Glow({ position, scale, color, opacity }: { position: [number, number, number]; scale: number; color: string; opacity: number }) {
  const glow = useGlowTexture(["rgba(255,255,255,1)", "rgba(255,255,255,0.25)", "rgba(255,255,255,0)"]);
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={glow} color={color} transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} />
    </sprite>
  );
}

/* ───────── 4. 은하 소용돌이 ───────── */

function Galaxy({ moving }: { moving: boolean }) {
  const glow = useGlowTexture();
  const ref = useRef<Group>(null);
  const { positions, colors } = useMemo(() => {
    const r = rng(7);
    const n = 7000;
    const arms = 3;
    const radius = 4.6;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const inner = new Color("#ffd9a0");
    const mid = new Color("#ff8ad8");
    const outer = new Color("#6f7bff");
    const c = new Color();
    for (let i = 0; i < n; i++) {
      const d = Math.pow(r(), 1.6) * radius;
      const arm = ((i % arms) / arms) * Math.PI * 2;
      const spread = (1 - d / radius) * 0.5 + 0.12;
      const angle = arm + d * 1.15 + (r() - 0.5) * spread * 2;
      positions[i * 3] = Math.cos(angle) * d + (r() - 0.5) * spread;
      positions[i * 3 + 1] = (r() - 0.5) * 0.28 * (1 - d / radius + 0.2);
      positions[i * 3 + 2] = Math.sin(angle) * d + (r() - 0.5) * spread;
      const t = d / radius;
      if (t < 0.45) c.copy(inner).lerp(mid, t / 0.45);
      else c.copy(mid).lerp(outer, (t - 0.45) / 0.55);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);
  useFrame((_, dt) => {
    if (moving && ref.current) ref.current.rotation.y += dt * 0.06;
  });
  return (
    <group position={[0, 0.9, 0]} rotation={[1.05, 0, 0.35]}>
      <group ref={ref}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.075} map={glow} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
        </points>
      </group>
      <Glow position={[0, 0, 0]} scale={3.2} color="#ffd9a0" opacity={0.9} />
      <Glow position={[0, 0, 0]} scale={7} color="#8a6cff" opacity={0.35} />
    </group>
  );
}

/* ───────── 5. 떠다니는 타로 ───────── */

const CARDS: Array<{ title: string; symbol: "sun" | "moon" | "star" | "wheel" | "eye" | "heart" }> = [
  { title: "별", symbol: "star" },
  { title: "달", symbol: "moon" },
  { title: "해", symbol: "sun" },
  { title: "운명의 수레바퀴", symbol: "wheel" },
  { title: "여사제", symbol: "eye" },
  { title: "연인", symbol: "heart" },
];

function drawCard(title: string, symbol: (typeof CARDS)[number]["symbol"] | "back") {
  const w = 256;
  const h = 420;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#3a2380");
  bg.addColorStop(1, "#1b1250");
  g.fillStyle = bg;
  round(g, 0, 0, w, h, 22);
  g.fill();
  g.strokeStyle = "#f0c674";
  g.lineWidth = 6;
  round(g, 8, 8, w - 16, h - 16, 16);
  g.stroke();
  g.lineWidth = 2;
  round(g, 20, 20, w - 40, h - 40, 10);
  g.stroke();
  const cx = w / 2;
  const cy = symbol === "back" ? h / 2 : h / 2 - 24;
  g.fillStyle = "#ffe1a0";
  g.strokeStyle = "#ffe1a0";
  if (symbol === "sun") {
    g.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
      g.lineTo(cx + Math.cos(a) * 64, cy + Math.sin(a) * 64);
      g.stroke();
    }
    g.beginPath();
    g.arc(cx, cy, 32, 0, Math.PI * 2);
    g.fill();
  } else if (symbol === "moon") {
    g.beginPath();
    g.arc(cx, cy, 52, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2c1b68";
    g.beginPath();
    g.arc(cx + 24, cy - 16, 46, 0, Math.PI * 2);
    g.fill();
  } else if (symbol === "star" || symbol === "back") {
    const R = symbol === "back" ? 46 : 60;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? R * 0.28 : i % 4 ? R * 0.6 : R;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
    if (symbol === "back") {
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, 78, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 92, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (symbol === "wheel") {
    g.lineWidth = 5;
    g.beginPath();
    g.arc(cx, cy, 56, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 16, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      g.lineTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56);
      g.stroke();
    }
  } else if (symbol === "eye") {
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(cx - 62, cy);
    g.quadraticCurveTo(cx, cy - 50, cx + 62, cy);
    g.quadraticCurveTo(cx, cy + 50, cx - 62, cy);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, 18, 0, Math.PI * 2);
    g.fill();
  } else if (symbol === "heart") {
    g.beginPath();
    g.moveTo(cx, cy + 46);
    g.bezierCurveTo(cx - 80, cy - 6, cx - 34, cy - 66, cx, cy - 26);
    g.bezierCurveTo(cx + 34, cy - 66, cx + 80, cy - 6, cx, cy + 46);
    g.fill();
  }
  if (symbol !== "back") {
    g.fillStyle = "#ffe1a0";
    g.font = `bold ${title.length > 4 ? 22 : 30}px "Pretendard Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    g.textAlign = "center";
    g.fillText(title, cx, h - 58);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function FloatingCards({ moving }: { moving: boolean }) {
  const ring = useRef<Group>(null);
  const cards = useRef<Array<Group | null>>([]);
  const textures = useMemo(() => ({ faces: CARDS.map((c) => drawCard(c.title, c.symbol)), back: drawCard("", "back") }), []);
  useEffect(() => () => [...textures.faces, textures.back].forEach((t: Texture) => t.dispose()), [textures]);
  useFrame(({ clock }, dt) => {
    if (!moving) return;
    if (ring.current) ring.current.rotation.y += dt * 0.12;
    const t = clock.elapsedTime;
    cards.current.forEach((c, i) => {
      if (!c) return;
      c.position.y = Math.sin(t * 0.8 + i * 1.3) * 0.14;
      c.rotation.z = Math.sin(t * 0.6 + i) * 0.06;
    });
  });
  return (
    <group position={[0, 0.75, -1]} rotation={[0.22, 0, 0]}>
      <Glow position={[0, 0, -2]} scale={9} color="#a05cff" opacity={0.35} />
      <Glow position={[-2.4, 1.4, -4]} scale={6} color="#ff7ac8" opacity={0.22} />
      <Glow position={[2.6, -0.6, -4]} scale={6} color="#5aa8ff" opacity={0.2} />
      <group ref={ring}>
        {CARDS.map((c, i) => {
          const a = (i / CARDS.length) * Math.PI * 2;
          return (
            // 고리 둘레에 바깥을 보며 서 있고, 앞면(그림)은 바깥쪽·뒷면(무늬)은 안쪽
            <group key={c.title} position={[Math.sin(a) * 2.5, 0, Math.cos(a) * 2.5]} rotation={[0, a, 0]}>
              <group
                ref={(el) => {
                  cards.current[i] = el;
                }}
              >
                <mesh>
                  <planeGeometry args={[1.15, 1.9]} />
                  <meshBasicMaterial map={textures.faces[i]} />
                </mesh>
                <mesh rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[1.15, 1.9]} />
                  <meshBasicMaterial map={textures.back} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/* ───────── 6. 천구의 ───────── */

function Orrery({ moving }: { moving: boolean }) {
  const rings = useRef<Array<Group | null>>([]);
  const whole = useRef<Group>(null);
  const ticks = useMemo(() => {
    const n = 72;
    const a = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r1 = i % 6 === 0 ? 2.05 : 2.22;
      a.set([Math.cos(ang) * r1, Math.sin(ang) * r1, 0, Math.cos(ang) * 2.35, Math.sin(ang) * 2.35, 0], i * 6);
    }
    return a;
  }, []);
  const RINGS = [
    { r: 1.55, tilt: [1.2, 0, 0.3], speed: 0.35, planet: "#8fd4ff" },
    { r: 1.25, tilt: [0.4, 0.9, 0], speed: -0.5, planet: "#ff9ad6" },
    { r: 0.95, tilt: [1.9, 0.4, 0.6], speed: 0.7, planet: "#ffd98a" },
  ] as const;
  useFrame((_, dt) => {
    if (!moving) return;
    rings.current.forEach((g, i) => {
      if (g) g.rotation.z += dt * RINGS[i].speed;
    });
    if (whole.current) whole.current.rotation.y += dt * 0.08;
  });
  return (
    <group position={[0, 0.85, 0]} scale={0.85}>
      <Glow position={[0, 0, -1]} scale={8} color="#7c5cff" opacity={0.35} />
      {/* 바깥 황도 고리 + 눈금 (카메라를 향해 살짝 기울임) */}
      <group rotation={[0.25, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.35, 0.018, 6, 160]} />
          <meshBasicMaterial color="#f0c674" transparent opacity={0.75} />
        </mesh>
        <mesh>
          <torusGeometry args={[2.05, 0.012, 6, 160]} />
          <meshBasicMaterial color="#f0c674" transparent opacity={0.5} />
        </mesh>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[ticks, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#f0c674" transparent opacity={0.55} />
        </lineSegments>
      </group>
      <group ref={whole}>
        {RINGS.map((ring, i) => (
          <group key={i} rotation={ring.tilt as unknown as [number, number, number]}>
            <group
              ref={(el) => {
                rings.current[i] = el;
              }}
            >
              <mesh>
                <torusGeometry args={[ring.r, 0.022, 6, 120]} />
                <meshBasicMaterial color="#e9c97a" side={DoubleSide} />
              </mesh>
              <mesh position={[ring.r, 0, 0]}>
                <sphereGeometry args={[0.1, 16, 12]} />
                <meshBasicMaterial color={ring.planet} />
              </mesh>
              <Glow position={[ring.r, 0, 0]} scale={0.7} color={ring.planet} opacity={0.8} />
            </group>
          </group>
        ))}
      </group>
      {/* 가운데 빛나는 구슬 */}
      <mesh>
        <sphereGeometry args={[0.42, 32, 24]} />
        <meshBasicMaterial color="#fff1c9" />
      </mesh>
      <Glow position={[0, 0, 0]} scale={2.6} color="#ffd98a" opacity={0.95} />
    </group>
  );
}
