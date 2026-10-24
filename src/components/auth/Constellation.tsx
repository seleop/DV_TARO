import type { CSSProperties } from "react";

/**
 * 회원가입 진행 표시: 단계마다 별이 하나씩 켜지고 선으로 이어져 별자리가 된다.
 * 시안 A(빛의 실, 2026-10-24 사용자 결정): 단계를 마치면 앞 별에서 작은 빛 한 점이 다음 별로 흘러가며 가는 선을 긋고,
 * 빛이 닿는 순간 다음 별이 켜진다. 선은 희미하게 남아 우주 배경의 별자리처럼 보인다.
 * 별은 배경의 십자 빛 별과 같은 결(흰빛·라벤더, 은은하게 반짝임)이라 배경과 섞인다.
 * 뒤로 가면 선이 거꾸로 걷히고 별이 꺼진다. '동작 줄이기' 설정이면 흐르는 빛·반짝임 없이 선만 나타난다.
 */
const POINTS: ReadonlyArray<readonly [number, number]> = [
  [36, 150],
  [92, 104],
  [148, 128],
  [196, 70],
  [254, 96],
  [272, 32],
];

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
@keyframes cst-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.8); opacity: 0; } }
.cst-travel { animation: cst-travel ${TRAVEL_MS}ms ${EASE} forwards; }
.cst-twinkle { animation: cst-twinkle 3.2s ease-in-out infinite; }
.cst-ring { transform-box: fill-box; transform-origin: center; animation: cst-ring 2s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cst-travel { animation: none; opacity: 0; }
  .cst-twinkle, .cst-ring { animation: none; }
}
`;

export function Constellation({ total, lit, current, done }: { total: number; lit: number; current: number; done: boolean }) {
  const pts = POINTS.slice(0, total);
  return (
    <svg viewBox="0 0 300 180" className="h-full w-full overflow-visible" role="img" aria-label={`가입 ${total}단계 중 ${Math.min(current + 1, total)}단계`}>
      <style>{STYLE}</style>
      <defs>
        <radialGradient id="cst-glow">
          <stop offset="0%" stopColor="#efe8ff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#b9a6ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8f7bff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {pts.slice(1).map(([x, y], i) => {
        const [px, py] = pts[i];
        const on = done || i + 1 < lit;
        const len = Math.hypot(x - px, y - py);
        const draw: CSSProperties = { transition: `stroke-dashoffset ${TRAVEL_MS}ms ${EASE}, opacity 400ms ease-out` };
        return (
          <g key={i}>
            {/* 아직 잇지 않은 구간: 아주 옅은 점선 */}
            <line x1={px} y1={py} x2={x} y2={y} stroke="#cfc8ff" strokeWidth={0.6} strokeDasharray="1.5 4" opacity={on ? 0 : 0.16} className="transition-opacity duration-500" />
            {/* 이어진 선: 넓고 옅은 빛 + 가는 선 (희미하게 남는다) */}
            <line x1={px} y1={py} x2={x} y2={y} stroke="#b9a6ff" strokeWidth={3.2} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={on ? 0 : len} opacity={on ? 0.14 : 0} style={draw} />
            <line x1={px} y1={py} x2={x} y2={y} stroke="#e4ddff" strokeWidth={0.9} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={on ? 0 : len} opacity={on ? 0.5 : 0} style={draw} />
            {/* 흐르는 빛: 이 구간이 이어지는 순간 앞 별에서 다음 별로 한 번 흐른다 */}
            <g transform={`translate(${px} ${py})`}>
              <g key={on ? "on" : "off"} className={on ? "cst-travel" : undefined} style={{ opacity: 0, "--dx": `${x - px}px`, "--dy": `${y - py}px` } as CSSProperties}>
                <circle r={9} fill="url(#cst-glow)" />
                <circle r={1.8} fill="#ffffff" />
              </g>
            </g>
          </g>
        );
      })}

      {pts.map(([x, y], i) => {
        const on = done || i < lit;
        const cur = !done && i === current;
        // 방금 켜진 별(첫 별 제외)은 흐르는 빛이 닿을 때 켜진다
        const arriving = on && !done && i > 0 && i === lit - 1;
        const fade: CSSProperties = { transition: `opacity 500ms ease-out ${arriving ? TRAVEL_MS - 200 : 0}ms` };
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {/* 켜지지 않은 별: 배경의 작은 별처럼 */}
            <circle r={1.5} fill="#b7aee6" opacity={on || cur ? 0 : 0.6} className="transition-opacity duration-500" />
            {/* 지금 단계의 별: 흰 점과 퍼져 나가는 고리 */}
            {cur && (
              <g>
                <circle r={4} fill="none" stroke="#d9d0ff" strokeWidth={0.8} className="cst-ring" />
                <circle r={2.2} fill="#ffffff" />
              </g>
            )}
            {/* 켜진 별: 은은한 빛무리 + 십자 빛 + 흰 핵, 천천히 반짝인다 */}
            <g style={{ ...fade, opacity: on ? 1 : 0 }}>
              <g className={on ? "cst-twinkle" : undefined}>
                <circle r={12} fill="url(#cst-glow)" />
                <path d="M -9 0 L 9 0 M 0 -9 L 0 9" stroke="#f2edff" strokeWidth={0.7} strokeLinecap="round" opacity={0.75} />
                <path d="M -3.6 -3.6 L 3.6 3.6 M -3.6 3.6 L 3.6 -3.6" stroke="#f2edff" strokeWidth={0.5} strokeLinecap="round" opacity={0.45} />
                <circle r={2.6} fill="#ffffff" />
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
