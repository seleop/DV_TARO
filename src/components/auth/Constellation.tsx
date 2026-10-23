/** 회원가입 진행 표시: 단계마다 별이 하나씩 켜지고 선으로 이어져 별자리가 된다. */
const POINTS: ReadonlyArray<readonly [number, number]> = [
  [36, 150],
  [92, 104],
  [148, 128],
  [196, 70],
  [254, 96],
  [272, 32],
];

export function Constellation({ total, lit, current, done }: { total: number; lit: number; current: number; done: boolean }) {
  const pts = POINTS.slice(0, total);
  return (
    <svg viewBox="0 0 300 180" className="h-full w-full overflow-visible" role="img" aria-label={`가입 ${total}단계 중 ${Math.min(current + 1, total)}단계`}>
      <defs>
        <radialGradient id="cst-glow">
          <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {pts.slice(1).map(([x, y], i) => {
        const [px, py] = pts[i];
        const on = done || i + 1 < lit;
        const len = Math.hypot(x - px, y - py);
        return (
          <g key={i}>
            {/* 앞으로 이어질 선(흐린 안내선) */}
            <line x1={px} y1={py} x2={x} y2={y} stroke="#cfc8ff" strokeWidth={0.8} strokeDasharray="2 4" opacity={0.22} />
            <line
              x1={px}
              y1={py}
              x2={x}
              y2={y}
              stroke="#ffe9a8"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={on ? 0 : len}
              opacity={on ? 0.75 : 0}
              className="transition-[stroke-dashoffset,opacity] duration-700 ease-out motion-reduce:transition-none"
            />
          </g>
        );
      })}
      {pts.map(([x, y], i) => {
        const on = done || i < lit;
        const cur = !done && i === current;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r={on ? 14 : cur ? 11 : 0} fill="url(#cst-glow)" className="transition-all duration-500 motion-reduce:transition-none" />
            <circle
              r={on ? 4.2 : cur ? 3.8 : 2.8}
              fill={on ? "#fff6c8" : cur ? "#ffffff" : "#9a92c8"}
              opacity={on || cur ? 1 : 0.75}
              className={`transition-all duration-500 motion-reduce:transition-none ${cur ? "animate-pulse" : ""}`}
            />
          </g>
        );
      })}
    </svg>
  );
}
