/** 시안 4. 운명의 은하: 천천히 도는 나선 은하, 그 위에 겹친 운명의 수레바퀴(運命福吉), 고리 행성·푸른 행성·혜성, 작은 행성 표면 */
import { Glint, HANJA_FONT, Nebula, Scene, ShootingStar, StarField, polar, rng, v } from "./common";

const ID = "g4";
const GOLD = "#f4d38a";
const CX = 187;
const CY = 226;

/** 로그 나선 팔을 따라 흩뿌린 별 (은하 중심 기준 좌표) */
function galaxyDots() {
  const r = rng(404);
  const arms = 3;
  return Array.from({ length: 900 }, (_, i) => {
    const t = Math.pow(r(), 0.8);
    const theta = t * 3.4 * Math.PI + ((i % arms) / arms) * Math.PI * 2;
    const rad = 10 + t * 150;
    const spread = (1 - t) * 10 + 6;
    const g = () => (r() + r() + r() - 1.5) * spread;
    const x = Math.cos(theta) * rad + g();
    const y = Math.sin(theta) * rad + g();
    const col = t < 0.25 ? "#fff1d0" : t < 0.55 ? (r() < 0.5 ? "#ffb8e8" : "#ffd6f0") : r() < 0.6 ? "#9ab8ff" : "#c9a8ff";
    return { x, y, s: 0.35 + Math.pow(r(), 3) * 1.6, col, o: 0.45 + r() * 0.55 };
  });
}

export function GalaxyWheel() {
  const dots = galaxyDots();
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02021a" />
          <stop offset=".5" stopColor="#0c0a3a" />
          <stop offset="1" stopColor="#1e1258" />
        </linearGradient>
        <radialGradient id={`${ID}-core`}>
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".12" stopColor="#ffe6b0" stopOpacity=".9" />
          <stop offset=".35" stopColor="#ff9ad6" stopOpacity=".35" />
          <stop offset=".7" stopColor="#7a5cff" stopOpacity=".12" />
          <stop offset="1" stopColor="#7a5cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${ID}-sat`} cx=".35" cy=".3">
          <stop offset="0" stopColor="#ffe8c0" />
          <stop offset=".6" stopColor="#d89a6a" />
          <stop offset="1" stopColor="#5a3050" />
        </radialGradient>
        <radialGradient id={`${ID}-blue`} cx=".35" cy=".3">
          <stop offset="0" stopColor="#bfeaff" />
          <stop offset=".55" stopColor="#3a7ad8" />
          <stop offset="1" stopColor="#141c5a" />
        </radialGradient>
        <linearGradient id={`${ID}-tail`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#e8fbff" />
          <stop offset=".25" stopColor="#8ae0ff" stopOpacity=".6" />
          <stop offset="1" stopColor="#8ae0ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${ID}-ground`} cx=".5" cy="0" r="1">
          <stop offset="0" stopColor="#4a3a7a" />
          <stop offset=".3" stopColor="#2a1f56" />
          <stop offset="1" stopColor="#120c34" />
        </radialGradient>
        <clipPath id={`${ID}-front`}>
          <rect x="0" y="150" width="375" height="60" />
        </clipPath>
        <clipPath id={`${ID}-back`}>
          <rect x="0" y="90" width="375" height="60" />
        </clipPath>
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={70} cy={90} rx={150} ry={110} color="#ff4fa8" seed={41} freq={0.012} cut={0.6} opacity={0.45} />
      <Nebula id={`${ID}-n2`} cx={320} cy={330} rx={150} ry={110} color="#2ad1ff" seed={47} freq={0.012} cut={0.62} opacity={0.4} />
      <StarField seed={41} n={300} y={[0, 440]} size={[0.2, 1.1]} halo={0.06} />

      {/* 나선 은하 (기울여 납작하게 + 천천히 회전) */}
      <g transform={`translate(${CX} ${CY}) rotate(-22) scale(1 .52)`}>
        <circle r="190" fill={`url(#${ID}-core)`} opacity=".9" />
        <g className="hb-spin" style={v({ "--d": "150s", transformOrigin: "0px 0px" })}>
          <Nebula id={`${ID}-arm1`} cx={0} cy={0} rx={175} ry={175} color="#c9a8ff" seed={53} freq={0.016} cut={0.5} opacity={0.55} />
          <Nebula id={`${ID}-arm2`} cx={0} cy={0} rx={120} ry={120} color="#ffb8e8" seed={59} freq={0.022} cut={0.52} opacity={0.5} />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={d.col} opacity={d.o} />
          ))}
        </g>
        <circle r="26" fill="#fff6e0" opacity=".85" filter={`url(#${ID}-soft)`} />
        <circle r="9" fill="#ffffff" />
      </g>

      {/* 운명의 수레바퀴 (은은한 금선, 반대로 아주 천천히) */}
      <g className="hb-spin-r" style={v({ "--d": "300s", transformOrigin: `${CX}px ${CY}px` })} opacity=".55" filter={`url(#${ID}-glow)`}>
        <circle cx={CX} cy={CY} r={168} fill="none" stroke={GOLD} strokeWidth="1.4" />
        <circle cx={CX} cy={CY} r={160} fill="none" stroke={GOLD} strokeWidth=".6" strokeDasharray="1 4" />
        {Array.from({ length: 8 }, (_, i) => {
          const [x1, y1] = polar(CX, CY, 40, i * 45 + 22.5);
          const [x2, y2] = polar(CX, CY, 160, i * 45 + 22.5);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth=".5" strokeDasharray="3 5" />;
        })}
        {["運", "命", "福", "吉"].map((ch, i) => {
          const deg = i * 90 + 45;
          const [x, y] = polar(CX, CY, 168, deg);
          return (
            <g key={ch}>
              <circle cx={x} cy={y} r="11" fill="#0c0a3a" stroke={GOLD} strokeWidth="1.2" />
              <text x={x} y={y} fontSize="12" fill={GOLD} textAnchor="middle" dominantBaseline="central" fontFamily={HANJA_FONT} fontWeight="700">
                {ch}
              </text>
            </g>
          );
        })}
      </g>

      {/* 고리 행성 (고리 뒤쪽 → 행성 → 고리 앞쪽) */}
      <g transform="translate(316 142) rotate(-18)">
        <g transform="translate(-316 -142)">
          <g clipPath={`url(#${ID}-back)`}>
            <ellipse cx="316" cy="150" rx="44" ry="10" fill="none" stroke="#f3d9b0" strokeWidth="4" opacity=".55" />
            <ellipse cx="316" cy="150" rx="36" ry="7.5" fill="none" stroke="#c9a880" strokeWidth="2" opacity=".6" />
          </g>
          <circle cx="316" cy="150" r="22" fill={`url(#${ID}-sat)`} />
          {[-10, -3, 5, 12].map((dy, i) => (
            <ellipse key={i} cx="316" cy={150 + dy} rx={Math.sqrt(484 - dy * dy)} ry="1.4" fill="#fff" opacity={0.08 + (i % 2) * 0.06} />
          ))}
          <g clipPath={`url(#${ID}-front)`}>
            <ellipse cx="316" cy="150" rx="44" ry="10" fill="none" stroke="#f3d9b0" strokeWidth="4" opacity=".75" />
            <ellipse cx="316" cy="150" rx="36" ry="7.5" fill="none" stroke="#c9a880" strokeWidth="2" opacity=".7" />
          </g>
        </g>
      </g>
      <circle cx="350" cy="196" r="4" fill="#d8d0e8" />
      {/* 푸른 행성 */}
      <circle cx="44" cy="318" r="27" fill="#5ab8ff" opacity=".15" filter={`url(#${ID}-soft)`} />
      <circle cx="44" cy="318" r="18" fill={`url(#${ID}-blue)`} />
      <path d="M30 312 q8 -4 16 0 t14 -2" stroke="#e0f6ff" strokeWidth="1.4" fill="none" opacity=".45" />
      <path d="M32 324 q10 3 22 -1" stroke="#e0f6ff" strokeWidth="1" fill="none" opacity=".35" />
      {/* 혜성 */}
      <g className="hb-float" style={v({ "--d": "9s" })}>
        <path d="M78 122 L-30 60 L-26 52 Z" fill={`url(#${ID}-tail)`} opacity=".9" />
        <path d="M78 122 L-20 78 L-18 72 Z" fill={`url(#${ID}-tail)`} opacity=".5" />
        <circle cx="78" cy="122" r="7" fill="#bff0ff" opacity=".35" />
        <circle cx="78" cy="122" r="2.6" fill="#fff" />
      </g>
      <Glint x={120} y={70} r={1.4} />
      <Glint x={262} y={312} r={1.2} delay={1.6} color="#ffd6f0" />
      <Glint x={30} y={210} r={1.1} delay={2.8} color="#cfe4ff" />
      <Glint x={350} y={260} r={1.3} delay={0.9} />
      <ShootingStar id={`${ID}-s1`} x={200} y={40} delay={4} />
      <ShootingStar id={`${ID}-s2`} x={20} y={260} dx={140} dy={50} delay={8} d={12} />

      {/* 작은 행성 표면 (별이가 선 곳) */}
      <ellipse cx={CX} cy={448} rx={260} ry={16} fill="#9a7cff" opacity=".35" filter={`url(#${ID}-soft)`} />
      <circle cx={CX} cy={1150} r={700} fill={`url(#${ID}-ground)`} />
      <circle cx={CX} cy={1150} r={700} fill="none" stroke="#c9a8ff" strokeWidth="1.4" opacity=".7" />
      {[
        [70, 470, 16, 4],
        [140, 492, 10, 3],
        [250, 476, 20, 5],
        [320, 500, 12, 3],
        [200, 510, 9, 2.4],
      ].map(([x, y, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#140c38" opacity=".7" />
          <ellipse cx={x} cy={y - ry * 0.4} rx={rx} ry={ry * 0.6} fill="none" stroke="#6a5aa8" strokeWidth=".8" opacity=".6" />
        </g>
      ))}
    </Scene>
  );
}
