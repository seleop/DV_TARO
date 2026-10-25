/**
 * 홈 밤하늘 SVG 배경 공용 부품 (2026-10-25 사용자 결정: 디테일한 SVG, 단조롭지 않게, 성능은 신경 쓰지 말 것).
 *  - 장면 좌표계: 375×520, 아래 기준으로 잘라 맞춤(xMidYMax slice). 작은 화면은 위쪽 ~110이 잘리고, 큰 화면은 좌우가 조금 잘린다
 *  - 말풍선은 위쪽(약 y 40~110), 별이는 가운데 아래(약 y 300~480)에 서므로 주인공 그림은 y 120~330 띠에 둔다
 *  - 성운은 feTurbulence 잡음으로 만든 구름, 빛나는 것은 가우스 흐림 빛 번짐
 *  - 움직임은 CSS(반짝임·회전·떠다님·흔들림·촛불·안개·물빛·별똥별·떠오름). '동작 줄이기' 설정이면 모두 멈춘다
 */
import type { CSSProperties, ReactNode } from "react";

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
  .hb-shimmer { animation: hb-shimmer var(--d, 3s) ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .hb-rise { animation: hb-rise var(--d, 26s) linear infinite; }
  .hb-ff { animation: hb-ff var(--d, 5s) ease-in-out infinite; }
  .hb-shoot { animation: hb-shoot var(--d, 9s) ease-out infinite; opacity: 0; }
  @media (prefers-reduced-motion: reduce) {
    .hb-tw, .hb-pulse, .hb-spin, .hb-spin-r, .hb-float, .hb-sway, .hb-drift, .hb-flicker, .hb-shimmer, .hb-rise, .hb-ff { animation: none; }
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
    </g>
  );
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* ───────── 별: 크기·색·깜빡임이 제각각인 별밭 ───────── */

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
  return (
    <g>
      {stars.map((st, i) => (
        <g key={i} className={st.tw ? "hb-tw" : undefined} style={v({ "--d": `${st.d}s`, animationDelay: `${st.delay}s` })}>
          {st.h && <circle cx={st.sx} cy={st.sy} r={st.s * 4} fill={st.c} opacity=".12" />}
          <circle cx={st.sx} cy={st.sy} r={st.s} fill={st.c} />
        </g>
      ))}
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
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
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
    <g className="hb-drift" style={v({ "--d": `${d}s` })} opacity={opacity} filter={`url(#${id}-haze)`}>
      <ellipse cx="60" cy={y} rx="120" ry="16" fill={color} />
      <ellipse cx="230" cy={y + 6} rx="140" ry="14" fill={color} />
      <ellipse cx="380" cy={y - 4} rx="110" ry="15" fill={color} />
    </g>
  );
}

/** 극좌표 점 */
export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => [cx + r * Math.cos(((deg - 90) * Math.PI) / 180), cy + r * Math.sin(((deg - 90) * Math.PI) / 180)];

export const BRANCHES = "子丑寅卯辰巳午未申酉戌亥".split("");
export const STEMS = "甲乙丙丁戊己庚辛壬癸".split("");
export const HANJA_FONT = '"Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", "Malgun Gothic", serif';
