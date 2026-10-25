/** 홈 성소 SVG 배경에 쓰는 그림 부품 (타로 카드·촛불·휘장) */
import { cos, rng, sin, v } from "./common";

const GOLD = "#f4d38a";

/* ───────── 타로 카드 (금테·모서리 장식·숫자·그림) ───────── */

export type CardArt = "sun" | "moon" | "star" | "wheel" | "world" | "eye";

export function TarotCard({ id, x, y, w = 56, rot = 0, art, numeral, title, delay = 0, d = 6 }: { id: string; x: number; y: number; w?: number; rot?: number; art: CardArt; numeral: string; title: string; delay?: number; d?: number }) {
  const h = w * 1.7;
  const cx = x + w / 2;
  const cy = y + h * 0.47;
  const s = w / 56;
  return (
    <g transform={`rotate(${rot} ${cx} ${y + h / 2})`}>
      <g className="hb-float" style={v({ "--d": `${d}s`, animationDelay: `${delay}s` })}>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4b2a9c" />
            <stop offset=".55" stopColor="#25146c" />
            <stop offset="1" stopColor="#3b1a6e" />
          </linearGradient>
        </defs>
        {/* 카드 뒤 빛 */}
        <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={10 * s} fill={GOLD} opacity=".14" filter={`url(#${id.split("-")[0]}-soft)`} />
        <rect x={x} y={y} width={w} height={h} rx={6 * s} fill={`url(#${id}-bg)`} stroke={GOLD} strokeWidth={1.6 * s} />
        <rect x={x + 4 * s} y={y + 4 * s} width={w - 8 * s} height={h - 8 * s} rx={3.5 * s} fill="none" stroke={GOLD} strokeWidth={0.6 * s} opacity=".85" />
        <rect x={x + 7 * s} y={y + 15 * s} width={w - 14 * s} height={h - 33 * s} rx={2 * s} fill="#170c45" stroke={GOLD} strokeWidth={0.5 * s} opacity=".9" />
        {/* 잔별 */}
        {Array.from({ length: 9 }, (_, i) => {
          const r = rng(i * 13 + art.length * 7 + numeral.length);
          return <circle key={i} cx={x + 10 * s + r() * (w - 20 * s)} cy={y + 18 * s + r() * (h - 40 * s)} r={0.5 * s} fill="#ffe7b0" opacity=".8" />;
        })}
        {/* 모서리 장식 */}
        {[
          [x + 4 * s, y + 4 * s],
          [x + w - 4 * s, y + 4 * s],
          [x + 4 * s, y + h - 4 * s],
          [x + w - 4 * s, y + h - 4 * s],
        ].map(([px, py], i) => (
          <g key={i}>
            <circle cx={px} cy={py} r={1.8 * s} fill={GOLD} />
            <path d={`M${px - 3 * s} ${py}h${6 * s}M${px} ${py - 3 * s}v${6 * s}`} stroke={GOLD} strokeWidth={0.5 * s} />
          </g>
        ))}
        <text x={cx} y={y + 11.5 * s} textAnchor="middle" fontSize={6.5 * s} fill={GOLD} fontFamily="Georgia, serif" letterSpacing={0.5}>
          {numeral}
        </text>
        <text x={cx} y={y + h - 6.5 * s} textAnchor="middle" fontSize={5.6 * s} fill={GOLD} fontWeight="700">
          {title}
        </text>
        <g filter={`url(#${id.split("-")[0]}-glow)`}>
          <CardSymbol art={art} cx={cx} cy={cy} s={s} />
        </g>
      </g>
    </g>
  );
}

function CardSymbol({ art, cx, cy, s }: { art: CardArt; cx: number; cy: number; s: number }) {
  const c = "#ffe4a0";
  if (art === "sun")
    return (
      <g>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const r2 = (i % 2 ? 13 : 17) * s;
          return <path key={i} d={`M${cx + cos(a - 0.12) * 8 * s} ${cy + sin(a - 0.12) * 8 * s}L${cx + cos(a) * r2} ${cy + sin(a) * r2}L${cx + cos(a + 0.12) * 8 * s} ${cy + sin(a + 0.12) * 8 * s}Z`} fill={c} />;
        })}
        <circle cx={cx} cy={cy} r={7.5 * s} fill={c} />
        <circle cx={cx - 2.4 * s} cy={cy - 1 * s} r={0.9 * s} fill="#8a5a20" />
        <circle cx={cx + 2.4 * s} cy={cy - 1 * s} r={0.9 * s} fill="#8a5a20" />
        <path d={`M${cx - 2.6 * s} ${cy + 2.2 * s}q${2.6 * s} ${2.4 * s} ${5.2 * s} 0`} stroke="#8a5a20" strokeWidth={0.7 * s} fill="none" />
      </g>
    );
  if (art === "moon")
    return (
      <g>
        <circle cx={cx} cy={cy} r={13 * s} fill="none" stroke={c} strokeWidth={0.5 * s} opacity=".6" />
        <path d={`M${cx + 3 * s} ${cy - 11 * s}a${11 * s} ${11 * s} 0 1 0 ${6 * s} ${19 * s}a${9 * s} ${9 * s} 0 1 1 ${-6 * s} ${-19 * s}Z`} fill={c} />
        {[-14, 14].map((dx) => (
          <path key={dx} d={`M${cx + dx * s} ${cy + 16 * s}v${-6 * s}l${2 * s} ${-2 * s}l${2 * s} ${2 * s}v${6 * s}Z`} transform={`translate(${-2 * s} 0)`} fill={c} opacity=".7" />
        ))}
      </g>
    );
  if (art === "star")
    return (
      <g>
        <path
          d={Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
            const r = (i % 2 ? 3.6 : i % 4 ? 9 : 16) * s;
            return `${i ? "L" : "M"}${cx + cos(a) * r} ${cy + sin(a) * r}`;
          }).join("") + "Z"}
          fill={c}
        />
        {[
          [-12, -10],
          [12, -12],
          [-13, 9],
          [13, 10],
          [0, 15],
        ].map(([dx, dy], i) => (
          <circle key={i} cx={cx + dx * s} cy={cy + dy * s} r={1.2 * s} fill={c} />
        ))}
      </g>
    );
  if (art === "wheel")
    return (
      <g fill="none" stroke={c}>
        <circle cx={cx} cy={cy} r={14 * s} strokeWidth={1.4 * s} />
        <circle cx={cx} cy={cy} r={10.5 * s} strokeWidth={0.6 * s} />
        <circle cx={cx} cy={cy} r={3.5 * s} fill={c} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <line key={i} x1={cx + cos(a) * 3.5 * s} y1={cy + sin(a) * 3.5 * s} x2={cx + cos(a) * 14 * s} y2={cy + sin(a) * 14 * s} strokeWidth={0.8 * s} />;
        })}
        {Array.from({ length: 4 }, (_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return <circle key={i} cx={cx + cos(a) * 17.5 * s} cy={cy + sin(a) * 17.5 * s} r={1.4 * s} fill={c} />;
        })}
      </g>
    );
  if (art === "world")
    return (
      <g fill="none" stroke={c}>
        <ellipse cx={cx} cy={cy} rx={11 * s} ry={15 * s} strokeWidth={1.6 * s} strokeDasharray={`${2 * s} ${1 * s}`} />
        <path d={`M${cx} ${cy - 7 * s}l${2 * s} ${5 * s}h${4 * s}l${-3 * s} ${3 * s}l${1 * s} ${5 * s}l${-4 * s} ${-3 * s}l${-4 * s} ${3 * s}l${1 * s} ${-5 * s}l${-3 * s} ${-3 * s}h${4 * s}Z`} fill={c} stroke="none" />
      </g>
    );
  return (
    <g fill="none" stroke={c}>
      <path d={`M${cx - 15 * s} ${cy}Q${cx} ${cy - 13 * s} ${cx + 15 * s} ${cy}Q${cx} ${cy + 13 * s} ${cx - 15 * s} ${cy}Z`} strokeWidth={1.3 * s} />
      <circle cx={cx} cy={cy} r={5 * s} fill={c} />
      <circle cx={cx} cy={cy} r={2 * s} fill="#25146c" stroke="none" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI + (i / 6) * Math.PI;
        return <line key={i} x1={cx + cos(a) * 15 * s} y1={cy + sin(a) * 12 * s} x2={cx + cos(a) * 19 * s} y2={cy + sin(a) * 16 * s} strokeWidth={0.7 * s} />;
      })}
    </g>
  );
}

/* ───────── 촛불 ───────── */

export function Candle({ id, x, y, h = 26, w = 8, delay = 0 }: { id: string; x: number; y: number; h?: number; w?: number; delay?: number }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-wax`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9c6b0" />
          <stop offset=".45" stopColor="#fff6e6" />
          <stop offset="1" stopColor="#b8a088" />
        </linearGradient>
        <radialGradient id={`${id}-fl`} cx=".5" cy=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor="#fff2a8" />
          <stop offset=".75" stopColor="#ffab3a" />
          <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
        </radialGradient>
        {/* 불꽃에서 가장자리로 부드럽게 사라지는 빛 (테두리 없는 둥근 번짐) */}
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="#fff1b8" stopOpacity=".75" />
          <stop offset=".16" stopColor="#ffd98a" stopOpacity=".42" />
          <stop offset=".42" stopColor="#ffb35a" stopOpacity=".16" />
          <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-pool`}>
          <stop offset="0" stopColor="#ffcf7a" stopOpacity=".42" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 바닥에 비친 빛 */}
      <ellipse cx={x} cy={y + 1} rx={w * 3.4} ry={w * 0.9} fill={`url(#${id}-pool)`} className="hb-candle" style={v({ "--d": `${1.7 + (delay % 0.5)}s`, animationDelay: `${delay}s` })} />
      {/* 불꽃 둘레 빛: 크기는 그대로, 밝기만 촛불처럼 불규칙하게 일렁인다 */}
      <circle cx={x} cy={y - h - 7} r={w * 4.4} fill={`url(#${id}-halo)`} className="hb-candle" style={v({ "--d": `${1.5 + (delay % 0.7)}s`, animationDelay: `${-delay}s` })} />
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={1.5} fill={`url(#${id}-wax)`} />
      {/* 불빛을 받은 초 윗부분 */}
      <rect x={x - w / 2} y={y - h} width={w} height={Math.min(h, 7)} rx={1.5} fill="#ffd98a" opacity=".35" />
      <path d={`M${x - w / 2} ${y - h + 2}q${w * 0.2} ${4} 0 ${7}`} stroke="#fff6e6" strokeWidth="1.4" fill="none" />
      <ellipse cx={x} cy={y - h} rx={w / 2} ry={1.2} fill="#f3e6d4" />
      <line x1={x} y1={y - h} x2={x} y2={y - h - 2.5} stroke="#3a2a20" strokeWidth=".8" />
      <g className="hb-flicker" style={v({ "--d": `${1.1 + (delay % 0.6)}s`, animationDelay: `${delay}s` })}>
        <path d={`M${x} ${y - h - 13}C${x + 3.6} ${y - h - 7} ${x + 3} ${y - h - 2} ${x} ${y - h - 1.5}C${x - 3} ${y - h - 2} ${x - 3.6} ${y - h - 7} ${x} ${y - h - 13}Z`} fill={`url(#${id}-fl)`} filter={`url(#${id.split("-")[0]}-glow)`} />
      </g>
      <ellipse cx={x} cy={y} rx={w * 0.9} ry={1.6} fill="#000" opacity=".3" />
    </g>
  );
}

/* ───────── 휘장 (모서리에서 늘어진 천, 금빛 술) ───────── */

export function Drape({ id, side, color = "#5a1a5e", dark = "#2a0a32" }: { id: string; side: "left" | "right"; color?: string; dark?: string }) {
  const flip = side === "right" ? "translate(375 0) scale(-1 1)" : undefined;
  return (
    <g transform={flip}>
      <defs>
        <linearGradient id={`${id}-dr`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={dark} />
          <stop offset=".25" stopColor={color} />
          <stop offset=".45" stopColor={dark} />
          <stop offset=".65" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <g className="hb-sway" style={v({ "--d": "9s" })}>
        <path d="M-10 0 H130 Q110 40 70 70 Q40 92 30 150 Q22 220 18 300 Q10 360 -10 380 Z" fill={`url(#${id}-dr)`} />
        {/* 주름 */}
        {[24, 46, 70].map((x, i) => (
          <path key={i} d={`M${x + 20} 0 Q${x} ${80 + i * 10} ${x - 30 + i * 6} ${200 + i * 50}`} stroke="#000" strokeWidth="6" opacity=".18" fill="none" />
        ))}
        {/* 금빛 테 + 별 무늬 */}
        <path d="M130 0 Q110 40 70 70 Q40 92 30 150 Q22 220 18 300 Q10 360 -10 380" stroke={GOLD} strokeWidth="2.2" fill="none" />
        <path d="M122 0 Q102 38 64 66 Q34 88 24 150 Q16 220 12 300" stroke={GOLD} strokeWidth=".7" fill="none" opacity=".7" strokeDasharray="2 3" />
        {[
          [40, 30],
          [70, 20],
          [20, 90],
          [12, 170],
          [8, 250],
          [50, 50],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 4}L${x + 1.2} ${y - 1.2}L${x + 4} ${y}L${x + 1.2} ${y + 1.2}L${x} ${y + 4}L${x - 1.2} ${y + 1.2}L${x - 4} ${y}L${x - 1.2} ${y - 1.2}Z`} fill={GOLD} opacity=".75" />
        ))}
        {/* 묶은 끈과 술 */}
        <path d="M-10 150 Q20 140 34 152" stroke={GOLD} strokeWidth="3" fill="none" />
        <g className="hb-sway" style={v({ "--d": "4s" })}>
          <line x1="34" y1="152" x2="36" y2="176" stroke={GOLD} strokeWidth="1.2" />
          <circle cx="36" cy="178" r="3.4" fill={GOLD} />
          <path d="M32 180 L30 200 M34 181 L33 202 M36 181 L36 203 M38 181 L39 202 M40 180 L42 200" stroke={GOLD} strokeWidth="1" />
        </g>
      </g>
    </g>
  );
}

