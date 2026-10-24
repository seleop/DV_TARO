import { useState, type CSSProperties } from "react";
import { CONSTELLATION_VIEW, constellationFor } from "./constellations";

/**
 * 가입 진행 표시: 실존 별자리(총 단계 수에 맞춘 전갈자리)의 별이 단계마다 하나씩 켜지고 이어진다.
 * 시안 A(빛의 실, 2026-10-24 사용자 결정): 단계를 마치면 이미 켜진 별(이어지는 별)에서 빛 한 점이 다음 별로 흘러가며
 * 가는 선을 긋고, 빛이 닿는 순간 다음 별이 켜진다. 선은 희미하게 남아 우주 배경의 별자리처럼 보인다.
 * 한 번에 여러 별이 켜지면(양력이라 윤달 단계를 건너뛸 때 등) 빛이 차례로 흐른다.
 * 처음 그릴 때 이미 켜져 있는 별(가입을 마치고 출생 정보부터 이어 할 때)은 흐르는 빛 없이 바로 보인다.
 * 별빛 오로라(2026-10-24 사용자 결정): 선은 가늘고 희미하게, 대신 이어진 선을 따라 청록·라벤더·분홍 빛이 천천히 흐르고
 * 선 둘레에 미세한 반짝이 가루가 깜빡인다. 별은 은은한 색 빛무리(청록·라벤더·분홍)로 천천히 반짝인다.
 * 뒤로 가면 선이 거꾸로 걷히고 별이 꺼진다. '동작 줄이기' 설정이면 흐르는 빛·반짝임 없이 선만 나타난다.
 */
/** 별빛 오로라 색 (별 빛무리·반짝이 가루) */
const HUES = ["#8ff0ff", "#c9b6ff", "#ffb3e0"];

/** 빛이 앞 별에서 다음 별까지 흐르는 시간(선이 그어지는 시간과 같다) */
const TRAVEL_MS = 1300;
const EASE = "cubic-bezier(.4,0,.2,1)";

const STYLE = `
@keyframes cst-travel {
  0% { transform: translate(0px, 0px); opacity: 0; }
  12% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
}
@keyframes cst-twinkle { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }
@keyframes cst-ring { 0% { transform: scale(1); opacity: 0.45; } 100% { transform: scale(2.8); opacity: 0; } }
@keyframes cst-flow { to { stroke-dashoffset: -60; } }
@keyframes cst-dust { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 0.9; transform: scale(1); } }
.cst-travel { animation: cst-travel ${TRAVEL_MS}ms ${EASE} both; }
.cst-twinkle { animation: cst-twinkle 3.6s ease-in-out infinite; }
.cst-ring { transform-box: fill-box; transform-origin: center; animation: cst-ring 2.2s ease-out infinite; }
.cst-flow { animation: cst-flow 3.2s linear infinite; }
.cst-dust { transform-box: fill-box; transform-origin: center; animation: cst-dust 2.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cst-travel { animation: none; opacity: 0; }
  .cst-twinkle, .cst-ring, .cst-flow, .cst-dust { animation: none; }
}
`;

export function Constellation({ total, lit, current, done }: { total: number; lit: number; current: number; done: boolean }) {
  const shape = constellationFor(total);
  const stars = shape.stars;
  const shown = done ? stars.length : lit;
  // 직전 켜진 개수(여러 별이 한꺼번에 켜질 때 차례로 흐르게)와 처음 그릴 때 켜져 있던 개수(흐르는 빛 없이 보임)
  const [mountLit] = useState(shown);
  const [track, setTrack] = useState({ shown, base: shown });
  if (track.shown !== shown) setTrack({ shown, base: track.shown });
  const base = track.shown !== shown ? track.shown : track.base;
  /** i번째 별이 이번에 켜질 때 빛이 출발하기까지 기다리는 시간 */
  const delayOf = (i: number) => (shown > base && i >= base ? (i - Math.max(base, 1)) * TRAVEL_MS * 0.8 : 0);

  return (
    <svg viewBox={`0 0 ${CONSTELLATION_VIEW} ${CONSTELLATION_VIEW}`} className="h-full w-full overflow-visible" role="img" aria-label={`가입 ${total}단계 중 ${Math.min(current + 1, total)}단계 (${shape.name})`}>
      <style>{STYLE}</style>
      <defs>
        <radialGradient id="cst-glow">
          <stop offset="0%" stopColor="#efe8ff" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#b9a6ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8f7bff" stopOpacity="0" />
        </radialGradient>
        {HUES.map((h, i) => (
          <radialGradient key={h} id={`cst-hue-${i}`}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="35%" stopColor={h} stopOpacity="0.22" />
            <stop offset="100%" stopColor={h} stopOpacity="0" />
          </radialGradient>
        ))}
        {/* 선을 따라 흐르는 오로라 빛: 색이 하늘 전체에서 천천히 돈다 */}
        <linearGradient id="cst-aurora" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={CONSTELLATION_VIEW} y2={CONSTELLATION_VIEW}>
          <stop offset="0%" stopColor="#8ff0ff" />
          <stop offset="35%" stopColor="#c9b6ff" />
          <stop offset="70%" stopColor="#ffb3e0" />
          <stop offset="100%" stopColor="#8ff0ff" />
          <animateTransform attributeName="gradientTransform" type="rotate" from={`0 150 150`} to={`360 150 150`} dur="14s" repeatCount="indefinite" />
        </linearGradient>
      </defs>

      {stars.map((s, i) => {
        if (s.from === null) return null;
        const p = stars[s.from];
        const on = i < shown;
        const len = Math.hypot(s.x - p.x, s.y - p.y);
        const animate = on && i >= mountLit;
        const delay = delayOf(i);
        const draw: CSSProperties = {
          transition: animate ? `stroke-dashoffset ${TRAVEL_MS}ms ${EASE} ${delay}ms, opacity 400ms ease-out ${delay}ms` : "stroke-dashoffset 600ms ease-out, opacity 400ms ease-out",
        };
        return (
          <g key={i}>
            {/* 아직 잇지 않은 구간: 아주 옅은 점선 */}
            <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke="#cfc8ff" strokeWidth={0.5} strokeDasharray="1.5 4" opacity={on ? 0 : 0.12} className="transition-opacity duration-500" />
            {/* 이어진 선: 넓고 아주 옅은 빛 + 가는 선 (희미하게 남는다) */}
            <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke="#b9a6ff" strokeWidth={2.6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={on ? 0 : len} opacity={on ? 0.08 : 0} style={draw} />
            <line x1={p.x} y1={p.y} x2={s.x} y2={s.y} stroke="#e4ddff" strokeWidth={0.6} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={on ? 0 : len} opacity={on ? 0.3 : 0} style={draw} />
            {/* 오로라: 선이 다 그어진 뒤 그 위로 색색의 빛이 천천히 흘러간다 */}
            <line
              x1={p.x}
              y1={p.y}
              x2={s.x}
              y2={s.y}
              stroke="url(#cst-aurora)"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeDasharray="10 20"
              className={on ? "cst-flow" : undefined}
              opacity={on ? 0.6 : 0}
              style={{ transition: `opacity 800ms ease-out ${animate ? delay + TRAVEL_MS : 0}ms`, animationDelay: `${-(i * 0.7)}s` }}
            />
            {/* 반짝이 가루: 선 둘레에서 깜빡인다 */}
            {on &&
              [0.3, 0.68].map((t, j) => (
                <circle
                  key={j}
                  cx={p.x + (s.x - p.x) * t + (j ? 2.5 : -2)}
                  cy={p.y + (s.y - p.y) * t + (j ? -2 : 2.5)}
                  r={0.9}
                  fill={HUES[(i + j) % HUES.length]}
                  className="cst-dust"
                  style={{ animationDelay: `${(animate ? (delay + TRAVEL_MS) / 1000 : 0) + ((i * 0.37 + j * 1.1) % 2.6)}s` }}
                />
              ))}
            {/* 흐르는 빛: 이 구간이 이어지는 순간 이어지는 별에서 이 별로 한 번 흐른다 */}
            <g transform={`translate(${p.x} ${p.y})`}>
              <g
                key={animate ? "on" : "off"}
                className={animate ? "cst-travel" : undefined}
                style={{ opacity: 0, animationDelay: `${delay}ms`, "--dx": `${s.x - p.x}px`, "--dy": `${s.y - p.y}px` } as CSSProperties}
              >
                <circle r={9} fill="url(#cst-glow)" />
                <circle r={1.8} fill="#ffffff" />
              </g>
            </g>
          </g>
        );
      })}

      {stars.map((s, i) => {
        const on = i < shown;
        const cur = !done && i === current;
        // 흐르는 빛이 닿을 때 켜진다 (첫 별·처음부터 켜진 별은 바로)
        const wait = on && i >= mountLit && s.from !== null ? delayOf(i) + TRAVEL_MS - 200 : 0;
        const fade: CSSProperties = { transition: `opacity 500ms ease-out ${wait}ms` };
        return (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            {/* 켜지지 않은 별: 배경의 작은 별처럼 */}
            <circle r={1.5} fill="#b7aee6" opacity={on || cur ? 0 : 0.6} className="transition-opacity duration-500" />
            {/* 지금 단계의 별: 흰 점과 퍼져 나가는 고리 */}
            {cur && (
              <g>
                <circle r={4} fill="none" stroke="#d9d0ff" strokeWidth={0.8} className="cst-ring" />
                <circle r={2.2} fill="#ffffff" />
              </g>
            )}
            {/* 켜진 별: 은은한 색 빛무리(청록·라벤더·분홍) + 가는 십자 빛 + 흰 핵, 천천히 반짝인다 */}
            <g style={{ ...fade, opacity: on ? 0.9 : 0 }}>
              <g className={on ? "cst-twinkle" : undefined} style={{ animationDelay: `${-(i * 0.53)}s` }}>
                <circle r={13} fill={`url(#cst-hue-${i % HUES.length})`} />
                <path d="M -8 0 L 8 0 M 0 -8 L 0 8" stroke="#f2edff" strokeWidth={0.5} strokeLinecap="round" opacity={0.6} />
                <path d="M -3 -3 L 3 3 M -3 3 L 3 -3" stroke="#f2edff" strokeWidth={0.4} strokeLinecap="round" opacity={0.35} />
                <circle r={2.1} fill="#ffffff" />
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
