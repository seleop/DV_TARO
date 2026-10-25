/**
 * 밤 장면 SVG 배경 공용 부품 (2026-10-25 사용자 결정: 디테일한 SVG, 단조롭지 않게, 성능은 신경 쓰지 말 것).
 *  - 장면 좌표계: 375×520, 아래 기준으로 잘라 맞춤(xMidYMax slice). 작은 화면은 위쪽 ~110이 잘리고, 큰 화면은 좌우가 조금 잘린다
 *  - 말풍선은 위쪽(약 y 40~110), 별이는 가운데 아래(약 y 300~480)에 서므로 주인공 그림은 y 120~330 띠에 둔다
 *  - 성운은 feTurbulence 잡음으로 만든 구름, 빛나는 것은 가우스 흐림 빛 번짐
 *  - 움직임은 CSS(반짝임·회전·떠다님·흔들림·촛불·안개·물빛·별똥별·떠오름). '동작 줄이기' 설정이면 모두 멈춘다
 *  - 성능 (2026-10-25 최적화): 잡음·흐림 필터는 근처에서 무엇이든 움직이면(별 반짝임 등) 매 프레임 다시 계산된다.
 *    그래서 움직이지 않는 필터 그림은 처음 그린 뒤 한 번만 비트맵으로 구워 둔다(Baked). 빛 번짐은 흐린 빛만 굽고
 *    또렷한 원본은 벡터로 그대로 둔다(Glow). 별 반짝임은 별마다 따로가 아니라 몇 묶음으로 나눠 움직인다
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** 장면 틀: 공용 필터·움직임 스타일을 담는다 */
export function Scene({ id, children }: { id: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 375 520" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        {/* 빛 번짐: 원본 + 흐린 빛 두 겹 */}
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 빛 번짐의 흐린 빛만 (원본 없음): Glow 가 이것만 굽고 원본은 벡터로 위에 그린다 */}
        <filter id={`${id}-halo`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
          </feMerge>
        </filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-haze`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {children}
      <style>{STYLE}</style>
    </svg>
  );
}

const STYLE = `
  @keyframes hb-tw { 0%,100% { opacity: 1 } 50% { opacity: .25 } }
  @keyframes hb-pulse { 0%,100% { opacity: .55; transform: scale(.92) } 50% { opacity: 1; transform: scale(1.08) } }
  @keyframes hb-spin { to { transform: rotate(360deg) } }
  @keyframes hb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  @keyframes hb-sway { 0%,100% { transform: rotate(-2.2deg) } 50% { transform: rotate(2.2deg) } }
  @keyframes hb-drift { 0% { transform: translateX(-18px) } 100% { transform: translateX(18px) } }
  @keyframes hb-flicker {
    0%,100% { transform: scale(1,1); opacity: .95 } 12% { transform: scale(.92,1.08) } 25% { transform: scale(1.06,.94); opacity: .8 }
    41% { transform: scale(.96,1.1); opacity: 1 } 63% { transform: scale(1.04,.92) } 80% { transform: scale(.94,1.06); opacity: .85 }
  }
  @keyframes hb-candle { 0%,100% { opacity: .9 } 18% { opacity: .72 } 34% { opacity: 1 } 52% { opacity: .8 } 71% { opacity: .96 } 86% { opacity: .76 } }
  @keyframes hb-shimmer { 0%,100% { opacity: .2; transform: scaleX(.7) } 50% { opacity: .9; transform: scaleX(1.15) } }
  @keyframes hb-rise { 0% { transform: translateY(0); opacity: 0 } 8% { opacity: 1 } 85% { opacity: .9 } 100% { transform: translateY(-420px); opacity: 0 } }
  @keyframes hb-ff { 0%,100% { transform: translate(0,0); opacity: .2 } 30% { opacity: 1 } 50% { transform: translate(6px,-10px); opacity: .7 } 75% { transform: translate(-4px,-4px); opacity: 1 } }
  @keyframes hb-shoot { 0% { transform: translate(0,0); opacity: 0 } 3% { opacity: 1 } 13% { transform: translate(var(--dx), var(--dy)); opacity: 0 } 100% { transform: translate(var(--dx), var(--dy)); opacity: 0 } }
  .hb-tw { animation: hb-tw var(--d, 3.4s) ease-in-out infinite; }
  .hb-pulse { animation: hb-pulse var(--d, 4s) ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .hb-spin { animation: hb-spin var(--d, 240s) linear infinite; transform-box: view-box; }
  .hb-spin-r { animation: hb-spin var(--d, 180s) linear infinite reverse; transform-box: view-box; }
  .hb-float { animation: hb-float var(--d, 6s) ease-in-out infinite; }
  .hb-sway { animation: hb-sway var(--d, 7s) ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
  .hb-drift { animation: hb-drift var(--d, 30s) ease-in-out infinite alternate; }
  .hb-flicker { animation: hb-flicker var(--d, 1.3s) ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
  .hb-candle { animation: hb-candle var(--d, 1.6s) ease-in-out infinite; }
  .hb-shimmer { animation: hb-shimmer var(--d, 3s) ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .hb-rise { animation: hb-rise var(--d, 26s) linear infinite; }
  .hb-ff { animation: hb-ff var(--d, 5s) ease-in-out infinite; }
  .hb-shoot { animation: hb-shoot var(--d, 9s) ease-out infinite; opacity: 0; }
  @media (prefers-reduced-motion: reduce) {
    .hb-tw, .hb-pulse, .hb-spin, .hb-spin-r, .hb-float, .hb-sway, .hb-drift, .hb-flicker, .hb-candle, .hb-shimmer, .hb-rise, .hb-ff { animation: none; }
    .hb-shoot { display: none; }
  }
`;

/** CSS 변수(지속 시간 등)를 style 로 넘기기 위한 형식 */
export const v = (o: Record<string, string | number>) => o as CSSProperties;

/* ───────── 성운 구름: 타원 모양 안을 잡음으로 채운다 ───────── */

export function Nebula({
  id,
  cx,
  cy,
  rx,
  ry,
  color,
  seed,
  freq = 0.011,
  density = 1.7,
  cut = 0.55,
  rotate = 0,
  opacity = 1,
  blend = "screen",
  className,
  style,
}: {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  seed: number;
  freq?: number;
  /** 잡음 대비 (클수록 구름 경계가 또렷) */
  density?: number;
  /** 잡음 문턱 (클수록 구름이 듬성듬성) */
  cut?: number;
  rotate?: number;
  opacity?: number;
  blend?: "screen" | "normal" | "multiply";
  className?: string;
  style?: CSSProperties;
}) {
  const [r, g, b] = hex(color);
  return (
    <g className={className} style={{ mixBlendMode: blend, ...style }} opacity={opacity}>
      <Baked id={id} maxScale={1.25}>
      <defs>
        <radialGradient id={`${id}-m`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-f`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="5" seed={seed} result="n" />
          <feColorMatrix in="n" type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  ${density} 0 0 0 ${-cut * density}`} result="c" />
          <feComposite in="c" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-m)`} filter={`url(#${id}-f)`} transform={`rotate(${rotate} ${cx} ${cy})`} />
      </Baked>
    </g>
  );
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ───────── 별: 크기·색·깜빡임이 제각각인 별밭 ───────── */

/** 별 반짝임 묶음: [주기(초), 시작 지연(초)] — 주기·박자가 서로 어긋나 묶음이어도 제각각 반짝이는 것처럼 보인다 */
const TWINKLE: Array<[number, number]> = [
  [2.3, 0],
  [3.1, 1.4],
  [3.9, 0.6],
  [4.6, 2.7],
  [5.4, 1.9],
  [6.2, 3.8],
];

const STAR_COLORS = ["#ffffff", "#ffffff", "#e8e2ff", "#fff1d0", "#cfe4ff", "#ffd6f0"];

export function StarField({
  seed,
  n,
  x = [0, 375],
  y = [0, 430],
  size = [0.3, 1.3],
  halo = 0.08,
  band,
}: {
  seed: number;
  n: number;
  x?: [number, number];
  y?: [number, number];
  size?: [number, number];
  /** 이 비율의 별에 은은한 빛 무리 */
  halo?: number;
  /** 은하수처럼 한 줄 띠에 몰리게: 중심선(x1,y1)-(x2,y2), 폭 */
  band?: { x1: number; y1: number; x2: number; y2: number; w: number };
}) {
  const r = rng(seed);
  const stars = Array.from({ length: n }, () => {
    let sx = x[0] + r() * (x[1] - x[0]);
    let sy = y[0] + r() * (y[1] - y[0]);
    if (band) {
      const t = r();
      const g = (r() + r() + r() - 1.5) * band.w;
      const dx = band.x2 - band.x1;
      const dy = band.y2 - band.y1;
      const len = Math.hypot(dx, dy);
      sx = band.x1 + dx * t + (-dy / len) * g;
      sy = band.y1 + dy * t + (dx / len) * g;
    }
    return { sx, sy, s: size[0] + Math.pow(r(), 2.2) * (size[1] - size[0]), c: STAR_COLORS[Math.floor(r() * STAR_COLORS.length)], d: 2 + r() * 4.5, delay: r() * 6, h: r() < halo, tw: r() < 0.7 };
  });
  // 별마다 애니메이션을 두면 수백 개가 매 프레임 계산되므로, 반짝이는 별을 TWINKLE 묶음으로 나눠 묶음째 깜빡인다
  const groups: Array<typeof stars> = [[], ...TWINKLE.map(() => [])];
  stars.forEach((st) => groups[st.tw ? 1 + Math.min(TWINKLE.length - 1, Math.floor(((st.d - 2) / 4.5) * TWINKLE.length)) : 0].push(st));
  const dot = (st: (typeof stars)[number], i: number) => (
    <g key={i}>
      {st.h && <circle cx={st.sx} cy={st.sy} r={st.s * 4} fill={st.c} opacity=".12" />}
      <circle cx={st.sx} cy={st.sy} r={st.s} fill={st.c} />
    </g>
  );
  return (
    <g>
      {groups.map((g, k) =>
        k === 0 ? (
          <g key={k}>{g.map(dot)}</g>
        ) : (
          <g key={k} className="hb-tw" style={v({ "--d": `${TWINKLE[k - 1][0]}s`, animationDelay: `${TWINKLE[k - 1][1]}s` })}>
            {g.map(dot)}
          </g>
        ),
      )}
    </g>
  );
}

/** 빛 갈래가 긴 큰 별 (네 갈래 + 짧은 사선 갈래 + 무리) */
export function Glint({ x, y, r = 1.6, color = "#fff", delay = 0, d = 4 }: { x: number; y: number; r?: number; color?: string; delay?: number; d?: number }) {
  const L = r * 7;
  const l = r * 3;
  return (
    <g className="hb-pulse" style={v({ "--d": `${d}s`, animationDelay: `${delay}s` })}>
      <circle cx={x} cy={y} r={r * 5} fill={color} opacity=".1" />
      <circle cx={x} cy={y} r={r * 2.2} fill={color} opacity=".22" />
      <path
        d={`M${x} ${y - L}Q${x + r * 0.35} ${y - r * 0.35} ${x + L} ${y}Q${x + r * 0.35} ${y + r * 0.35} ${x} ${y + L}Q${x - r * 0.35} ${y + r * 0.35} ${x - L} ${y}Q${x - r * 0.35} ${y - r * 0.35} ${x} ${y - L}Z`}
        fill={color}
      />
      <path d={`M${x - l} ${y - l}L${x + l} ${y + l}M${x + l} ${y - l}L${x - l} ${y + l}`} stroke={color} strokeWidth={r * 0.35} opacity=".6" strokeLinecap="round" />
      <circle cx={x} cy={y} r={r * 0.9} fill="#fff" />
    </g>
  );
}

/** 별똥별 (몇 초마다 비스듬히 지나간다) */
export function ShootingStar({ id, x, y, dx = 170, dy = 70, delay = 0, d = 9, len = 60 }: { id: string; x: number; y: number; dx?: number; dy?: number; delay?: number; d?: number; len?: number }) {
  const ang = Math.round((Math.atan2(dy, dx) * 180) / Math.PI * 100) / 100;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id={`${id}-t`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".3" stopColor="#cfe0ff" stopOpacity=".7" />
          <stop offset="1" stopColor="#cfe0ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="hb-shoot" style={v({ "--d": `${d}s`, "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${delay}s` })}>
        <g transform={`rotate(${ang})`}>
          <path d={`M0 0 L${-len} -1.2 L${-len} 1.2 Z`} fill={`url(#${id}-t)`} />
          <circle r="1.8" fill="#fff" />
          <circle r="5" fill="#fff" opacity=".2" />
        </g>
      </g>
    </g>
  );
}

/** 반딧불·빛 먼지 */
export function Fireflies({ seed, n, x, y, color = "#fff3a8", size = 1.4 }: { seed: number; n: number; x: [number, number]; y: [number, number]; color?: string; size?: number }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const fx = x[0] + r() * (x[1] - x[0]);
        const fy = y[0] + r() * (y[1] - y[0]);
        const s = size * (0.6 + r() * 0.8);
        return (
          <g key={i} className="hb-ff" style={v({ "--d": `${4 + r() * 4}s`, animationDelay: `${-r() * 8}s` })}>
            <circle cx={fx} cy={fy} r={s * 4} fill={color} opacity=".15" />
            <circle cx={fx} cy={fy} r={s} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

/** 낮게 깔려 흐르는 안개 띠 */
export function Mist({ id, y, color = "#b9a6ff", opacity = 0.35, d = 34 }: { id: string; y: number; color?: string; opacity?: number; d?: number }) {
  return (
    <g className="hb-drift" style={v({ "--d": `${d}s` })} opacity={opacity}>
      <Baked id={`${id}-mist${y}`} pad={44}>
        <g filter={`url(#${id}-haze)`}>
          <ellipse cx="60" cy={y} rx="120" ry="16" fill={color} />
          <ellipse cx="230" cy={y + 6} rx="140" ry="14" fill={color} />
          <ellipse cx="380" cy={y - 4} rx="110" ry="15" fill={color} />
        </g>
      </Baked>
    </g>
  );
}

/**
 * 삼각함수 값은 서버(Node)와 브라우저가 마지막 자리까지 같지 않아 하이드레이션 경고가 나므로 반올림해서 쓴다
 * (덧셈·곱셈은 어디서나 같으므로 cos·sin 결과만 맞추면 된다)
 */
export const cos = (a: number) => Math.round(Math.cos(a) * 1e6) / 1e6;
export const sin = (a: number) => Math.round(Math.sin(a) * 1e6) / 1e6;

/** 극좌표 점 */
export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * cos(((deg - 90) * Math.PI) / 180), cy + r * sin(((deg - 90) * Math.PI) / 180)];

/* ───────── 굽기: 움직이지 않는 필터 그림을 한 번만 비트맵으로 ───────── */

type BakedImage = { url: string; x: number; y: number; w: number; h: number };
/** 구운 그림 (key → 결과). 같은 배경을 다시 그려도 다시 굽지 않는다. 몇십 장뿐이라 지우지 않는다 */
const bakedDone = new Map<string, BakedImage>();
const bakeQueue: Array<() => Promise<void>> = [];
let baking = false;
/** 한 번에 하나씩, 브라우저가 한가할 때 굽는다 (처음 화면 그리기를 방해하지 않게) */
function enqueue(job: () => Promise<void>) {
  bakeQueue.push(job);
  if (!baking) void drain();
}
async function drain() {
  baking = true;
  while (bakeQueue.length) {
    await idle();
    await bakeQueue.shift()!();
  }
  baking = false;
}
const idle = () =>
  new Promise<void>((r) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => r(), { timeout: 800 });
    else setTimeout(r, 60); // iOS Safari 등
  });

const SVG_NS = "http://www.w3.org/2000/svg";
/** 한 장 최대 픽셀 수 (메모리: 0.6M px ≈ 2.4MB). 큰 성운은 해상도를 낮춰 맞춘다 — 흐린 그림이라 티가 나지 않는다 */
const MAX_PIXELS = 600_000;

/** g 를 그대로 떼어 SVG 이미지로 그린 뒤 PNG 로 굽는다. 숨겨져 있으면(display:none) 잴 수 없어 "hidden" */
async function bake(g: SVGGElement, pad: number, maxScale: number): Promise<BakedImage | "hidden" | null> {
  const svg = g.ownerSVGElement;
  const ctm = g.getScreenCTM();
  if (!svg || !ctm) return "hidden";
  const bb = g.getBBox();
  if (!bb.width || !bb.height) return "hidden";
  const x = Math.floor(bb.x - pad);
  const y = Math.floor(bb.y - pad);
  const w = Math.ceil(bb.width + pad * 2);
  const h = Math.ceil(bb.height + pad * 2);
  // 화면 배율 × 기기 픽셀 배율 (넘치면 픽셀 수 한도에 맞춰 낮춘다)
  const screen = Math.hypot(ctm.a, ctm.b) * (window.devicePixelRatio || 1);
  const scale = Math.max(0.5, Math.min(maxScale, screen, Math.sqrt(MAX_PIXELS / (w * h))));
  const W = Math.round(w * scale);
  const H = Math.round(h * scale);
  // 안에서 쓰지 않고 장면 defs 에 있는 그라데이션·필터·마스크를 함께 담는다
  const body = new XMLSerializer().serializeToString(g);
  const defs: string[] = [];
  const seen = new Set<string>();
  const collect = (text: string) => {
    for (const m of text.matchAll(/url\(#([^)"']+)\)|href="#([^"]+)"/g)) {
      const ref = m[1] ?? m[2];
      if (seen.has(ref)) continue;
      seen.add(ref);
      if (g.querySelector(`[id="${ref}"]`)) continue;
      const el = svg.querySelector(`[id="${ref}"]`);
      if (!el) continue;
      const str = new XMLSerializer().serializeToString(el);
      defs.push(str);
      collect(str);
    }
  };
  collect(body);
  const markup = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}"><defs>${defs.join("")}</defs>${body}</svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  await (typeof img.decode === "function" ? img.decode() : new Promise((res, rej) => ((img.onload = res), (img.onerror = rej))));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  canvas.width = canvas.height = 0; // 캔버스 메모리 바로 돌려주기 (iOS)
  if (!blob) return null;
  return { url: URL.createObjectURL(blob), x, y, w, h };
}

/**
 * 움직이지 않는 필터 그림(잡음 성운·흐림·빛 번짐)을 처음 그린 뒤 한 번만 비트맵으로 굽는다.
 * - 바깥에서 움직이게(회전·흐름·떠다님) 해도 된다: 구운 그림을 통째로 옮기므로 매 프레임 필터를 다시 계산하지 않는다
 * - 안에 움직이는 것(hb-* 애니메이션)을 넣지 않는다 (구우면 멈춘다)
 * - id: 장면 안에서 유일한 이름 (같은 그림이면 같은 id 로 한 장을 함께 쓴다)
 * - pad: 필터가 그림 밖으로 번지는 너비 (흐림 σ의 3배쯤)
 * - maxScale: 장면 1단위당 최대 픽셀 (흐린 그림은 낮아도 티가 안 난다. 작고 또렷한 그림만 크게)
 * - 굽기 전·실패하면(오래된 브라우저 등) 원래 SVG 를 그대로 그린다
 */
export function Baked({ id, pad = 0, maxScale = 2, children }: { id: string; pad?: number; maxScale?: number; children: ReactNode }) {
  const ref = useRef<SVGGElement>(null);
  const [img, setImg] = useState<BakedImage | null>(null);
  useEffect(() => {
    const done = bakedDone.get(id);
    if (done) {
      // 이미 구운 그림: 바로 쓴다 (첫 렌더는 서버와 같아야 해서 효과에서 바꾼다)
      const t = setTimeout(() => setImg(done), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    let retry: ReturnType<typeof setTimeout>;
    const job = async () => {
      const g = ref.current;
      if (!alive || !g) return;
      const hit = bakedDone.get(id);
      if (hit) return setImg(hit);
      let r: BakedImage | "hidden" | null = null;
      try {
        r = await bake(g, pad, maxScale);
      } catch {
        r = null; // 그리기 실패: 원래 SVG 를 그대로 둔다
      }
      if (r === "hidden") {
        // 숨겨진 배경 층: 다시 보일 때쯤 다시 시도
        if (alive) retry = setTimeout(() => enqueue(job), 2000);
        return;
      }
      if (!r) return;
      bakedDone.set(id, r);
      if (alive) setImg(r);
    };
    enqueue(job);
    return () => {
      alive = false;
      clearTimeout(retry);
    };
  }, [id, pad, maxScale]);
  if (img) return <image href={img.url} x={img.x} y={img.y} width={img.w} height={img.h} preserveAspectRatio="none" />;
  return <g ref={ref}>{children}</g>;
}

/**
 * 빛 번짐(장면 glow 필터와 같은 모양): 흐린 빛만 구워 두고, 또렷한 원본은 벡터로 위에 그린다
 * (원본까지 구우면 고해상도 화면에서 금테·선이 흐려진다). id: "<장면 id>-<이름>"
 */
export function Glow({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <Baked id={id} pad={22}>
        <g filter={`url(#${id.split("-")[0]}-halo)`}>{children}</g>
      </Baked>
      {children}
    </>
  );
}
