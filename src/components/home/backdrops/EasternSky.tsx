/** 시안 5. 천상열차 별궁: 옛 천문도(28수 별자리) 원판, 떠오르는 풍등, 금빛 상서로운 구름, 초승달, 산수화 겹산·소나무·정자 */
import { Fireflies, Glint, Mist, Nebula, Scene, ShootingStar, StarField, polar, rng, v } from "./common";
import { CrescentMoon, Pine, SkyLantern } from "./art";

const ID = "e5";
const GOLD = "#f4d38a";
const CX = 187;
const CY = 226;

/** 원판 안 별자리 28개: 별 3~6개를 이은 무리 (천상열차분야지도처럼 별 색을 셋으로) */
function asterisms() {
  const r = rng(2828);
  const colors = ["#ffe6a0", "#ffffff", "#ff9a8a"];
  return Array.from({ length: 28 }, (_, i) => {
    const deg = (i / 28) * 360 + r() * 8;
    const rad = 52 + r() * 92;
    const [ax, ay] = polar(CX, CY, rad, deg);
    const n = 3 + Math.floor(r() * 4);
    const pts: Array<[number, number]> = [[ax, ay]];
    for (let k = 1; k < n; k++) {
      const [px, py] = pts[k - 1];
      const a = r() * Math.PI * 2;
      const d = 6 + r() * 9;
      const nx = px + Math.cos(a) * d;
      const ny = py + Math.sin(a) * d;
      // 원판 밖으로 나가지 않게
      pts.push(Math.hypot(nx - CX, ny - CY) < 150 ? [nx, ny] : [px - Math.cos(a) * d, py - Math.sin(a) * d]);
    }
    return { pts, color: colors[i % 3] };
  });
}

function AuspiciousCloud({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g className="hb-float" style={v({ "--d": "8s" })}>
        <path
          d="M-40 0 Q-40 -14 -26 -14 Q-24 -26 -10 -24 Q-2 -36 12 -28 Q26 -32 30 -18 Q44 -18 42 -4 Q40 6 28 6 L-30 6 Q-40 6 -40 0 Z"
          fill="#1c1d5a"
          stroke={GOLD}
          strokeWidth="1.3"
        />
        <path d="M-26 -14 q4 6 12 2 M-10 -24 q2 8 10 6 M12 -28 q0 8 8 9 M30 -18 q-2 8 4 12" stroke={GOLD} strokeWidth="1" fill="none" />
        <path d="M-12 -4 a5 5 0 1 1 6 -6 a3 3 0 1 0 -3 3" stroke={GOLD} strokeWidth="1" fill="none" />
        <path d="M14 -6 a5 5 0 1 0 -6 -6 a3 3 0 1 1 3 3" stroke={GOLD} strokeWidth="1" fill="none" />
        <path d="M42 -4 q16 2 22 -8" stroke={GOLD} strokeWidth="1.2" fill="none" />
      </g>
    </g>
  );
}

export function EasternSky() {
  const groups = asterisms();
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050826" />
          <stop offset=".45" stopColor="#111f58" />
          <stop offset=".75" stopColor="#2a2a70" />
          <stop offset="1" stopColor="#5a3a7a" />
        </linearGradient>
        <radialGradient id={`${ID}-disc`}>
          <stop offset="0" stopColor="#1a2a6a" stopOpacity=".7" />
          <stop offset=".9" stopColor="#0c1440" stopOpacity=".55" />
          <stop offset="1" stopColor="#0c1440" stopOpacity="0" />
        </radialGradient>
        {[1, 2, 3].map((k) => (
          <linearGradient key={k} id={`${ID}-mt${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={["#3a4a8a", "#24306a", "#121a44"][k - 1]} />
            <stop offset="1" stopColor={["#3a4a8a", "#24306a", "#121a44"][k - 1]} stopOpacity={k === 3 ? 1 : 0.1} />
          </linearGradient>
        ))}
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={300} cy={120} rx={160} ry={110} color="#5a7cff" seed={61} freq={0.012} cut={0.6} opacity={0.45} />
      <Nebula id={`${ID}-n2`} cx={60} cy={300} rx={140} ry={100} color="#ff7ab0" seed={67} freq={0.013} cut={0.63} opacity={0.3} />
      <StarField seed={51} n={260} y={[0, 420]} size={[0.25, 1.05]} halo={0.05} />
      <CrescentMoon id={`${ID}-moon`} x={56} y={140} r={17} />
      <Glint x={330} y={84} r={1.4} />
      <Glint x={350} y={300} r={1.1} delay={1.9} color="#ffe6a0" />
      <ShootingStar id={`${ID}-s1`} x={150} y={50} delay={2.5} />

      {/* 천문도 원판 */}
      <circle cx={CX} cy={CY} r={162} fill={`url(#${ID}-disc)`} />
      <g className="hb-spin" style={v({ "--d": "420s", transformOrigin: `${CX}px ${CY}px` })}>
        <g filter={`url(#${ID}-glow)`} opacity=".8">
          <circle cx={CX} cy={CY} r={158} fill="none" stroke={GOLD} strokeWidth="1.6" />
          <circle cx={CX} cy={CY} r={153} fill="none" stroke={GOLD} strokeWidth=".6" />
          <circle cx={CX} cy={CY} r={108} fill="none" stroke="#9ab8ff" strokeWidth=".8" />
          <circle cx={CX + 6} cy={CY + 12} r={110} fill="none" stroke="#ff9a8a" strokeWidth=".8" opacity=".8" />
          <circle cx={CX} cy={CY} r={42} fill="none" stroke={GOLD} strokeWidth=".9" />
          {Array.from({ length: 28 }, (_, i) => {
            const [x1, y1] = polar(CX, CY, 42, (i / 28) * 360);
            const [x2, y2] = polar(CX, CY, 153, (i / 28) * 360);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth=".35" opacity=".55" />;
          })}
          {Array.from({ length: 365 / 5 }, (_, i) => {
            const [x1, y1] = polar(CX, CY, 153, i * 5);
            const [x2, y2] = polar(CX, CY, 158, i * 5);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth=".5" />;
          })}
        </g>
        {groups.map((g, i) => (
          <g key={i}>
            <polyline points={g.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#cfd8ff" strokeWidth=".5" opacity=".7" />
            {g.pts.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={k === 0 ? 1.5 : 1.05} fill={g.color} className="hb-tw" style={v({ "--d": `${3 + (k % 3)}s`, animationDelay: `${(i * 0.3 + k) % 5}s` })} />
            ))}
          </g>
        ))}
        {/* 북극성 무리 */}
        {[
          [0, 0],
          [6, -4],
          [-5, -6],
          [3, 8],
          [-8, 4],
        ].map(([dx, dy], i) => (
          <circle key={i} cx={CX + dx} cy={CY + dy} r={i ? 1.1 : 2} fill="#ffe6a0" />
        ))}
      </g>
      <Glint x={CX} y={CY} r={1.8} d={3.4} color="#ffe6a0" />

      {/* 상서로운 구름 */}
      <AuspiciousCloud x={60} y={318} s={0.9} />
      <AuspiciousCloud x={318} y={296} s={0.8} flip />

      {/* 풍등 */}
      <SkyLantern id={`${ID}-l1`} x={40} y={420} s={0.8} delay={-5} d={36} />
      <SkyLantern id={`${ID}-l2`} x={96} y={440} s={0.55} delay={-17} d={42} />
      <SkyLantern id={`${ID}-l3`} x={150} y={430} s={0.7} delay={-27} d={38} />
      <SkyLantern id={`${ID}-l4`} x={240} y={436} s={0.6} delay={-11} d={40} />
      <SkyLantern id={`${ID}-l5`} x={300} y={424} s={0.85} delay={-21} d={34} />
      <SkyLantern id={`${ID}-l6`} x={348} y={440} s={0.5} delay={-31} d={46} />

      {/* 산수화 겹산과 안개 */}
      <path d="M0 400 C20 360 36 330 52 334 C66 338 70 372 92 370 C112 368 120 320 150 318 C176 316 182 364 206 362 C232 360 246 300 280 304 C306 308 312 352 334 350 C350 348 362 330 375 326 V430 H0Z" fill={`url(#${ID}-mt1)`} />
      <Mist id={ID} y={380} color="#a8b8ff" opacity={0.45} d={50} />
      <path d="M0 420 C30 400 50 370 74 374 C96 378 104 404 130 402 C160 400 168 376 196 378 C222 380 236 408 262 404 C290 400 302 366 330 368 C350 370 362 392 375 396 V450 H0Z" fill={`url(#${ID}-mt2)`} />
      <Mist id={`${ID}`} y={414} color="#c8b8ff" opacity={0.3} d={38} />
      <path d="M0 440 C40 424 70 432 110 438 C160 446 220 430 270 436 C320 442 350 430 375 432 V520 H0Z" fill={`url(#${ID}-mt3)`} />
      {/* 왼쪽 벼랑과 소나무 */}
      <path d="M0 520 V380 C14 376 30 384 40 398 C52 414 50 440 62 452 C70 462 70 490 80 520 Z" fill="#0a0f36" />
      <Pine x={22} y={384} s={0.9} color="#0a0f36" />
      {/* 오른쪽 봉우리 정자 */}
      <g fill="#0f1640">
        <path d="M300 372 L360 372 L352 366 L308 366Z" />
        <path d="M296 373 Q330 358 364 373 Q346 362 330 352 Q314 362 296 373Z" />
        <rect x="308" y="373" width="2.6" height="14" />
        <rect x="349" y="373" width="2.6" height="14" />
      </g>
      <rect x="318" y="376" width="22" height="9" fill="#ffcf7a" opacity=".8" className="hb-pulse" style={v({ "--d": "5s" })} />
      <Fireflies seed={57} n={14} x={[0, 375]} y={[400, 480]} color="#ffe6a0" size={1} />
    </Scene>
  );
}
