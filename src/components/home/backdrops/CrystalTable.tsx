/** 시안 6. 점술사의 수정구: 휘장 사이 밤하늘, 안에서 성운이 도는 수정구와 금빛 받침, 매달린 별·달 장식, 떠 있는 카드, 수놓은 탁자보·촛불·향 연기 */
import { Fireflies, Glint, Nebula, Scene, StarField, v } from "./common";
import { Candle, CrescentMoon, Drape, TarotCard } from "./art";

const ID = "f6";
const GOLD = "#f4d38a";
const BX = 187;
const BY = 210;
const BR = 64;

function Hanging({ x, len, kind, delay }: { x: number; len: number; kind: "star" | "moon"; delay: number }) {
  return (
    <g className="hb-sway" style={v({ "--d": `${5 + delay}s`, animationDelay: `${-delay}s`, transformOrigin: `${x}px 0px`, transformBox: "view-box" })}>
      <line x1={x} y1={0} x2={x} y2={len} stroke={GOLD} strokeWidth=".7" opacity=".8" />
      <g filter={`url(#${ID}-glow)`}>
        {kind === "star" ? (
          <path d={`M${x} ${len}l2.6 5.6l6 .6l-4.6 4l1.4 6l-5.4 -3.2l-5.4 3.2l1.4 -6l-4.6 -4l6 -.6Z`} fill={GOLD} />
        ) : (
          <path d={`M${x + 2} ${len}a8 8 0 1 0 5 14a6.4 6.4 0 1 1 -5 -14Z`} fill="#fff1c9" />
        )}
      </g>
    </g>
  );
}

export function CrystalTable() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07041e" />
          <stop offset=".5" stopColor="#1c0f48" />
          <stop offset="1" stopColor="#3a1a5e" />
        </linearGradient>
        <radialGradient id={`${ID}-ball`} cx=".38" cy=".34" r=".75">
          <stop offset="0" stopColor="#c9b6ff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#5a3cb0" stopOpacity=".35" />
          <stop offset="1" stopColor="#1a0c48" stopOpacity=".85" />
        </radialGradient>
        <radialGradient id={`${ID}-aura`}>
          <stop offset=".45" stopColor="#c9a8ff" stopOpacity=".5" />
          <stop offset=".7" stopColor="#ff9ad6" stopOpacity=".15" />
          <stop offset="1" stopColor="#ff9ad6" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${ID}-in`}>
          <circle cx={BX} cy={BY} r={BR - 1} />
        </clipPath>
        <linearGradient id={`${ID}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5a20" />
          <stop offset=".35" stopColor="#ffe6a8" />
          <stop offset=".6" stopColor="#d9a24a" />
          <stop offset="1" stopColor="#6a4018" />
        </linearGradient>
        <radialGradient id={`${ID}-cloth`} cx=".5" cy=".2" r=".9">
          <stop offset="0" stopColor="#5a2a8a" />
          <stop offset=".6" stopColor="#30145a" />
          <stop offset="1" stopColor="#170a30" />
        </radialGradient>
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={190} cy={160} rx={200} ry={150} color="#7a3cff" seed={71} freq={0.011} cut={0.52} opacity={0.6} />
      <Nebula id={`${ID}-n2`} cx={110} cy={260} rx={140} ry={100} color="#ff4fa8" seed={77} freq={0.013} cut={0.6} opacity={0.4} />
      <StarField seed={61} n={200} y={[0, 420]} size={[0.25, 1.05]} halo={0.06} />
      <Glint x={100} y={86} r={1.3} />
      <Glint x={290} y={110} r={1.5} delay={1.7} color="#ffe7b8" />
      <CrescentMoon id={`${ID}-moon`} x={300} y={150} r={13} />

      {/* 위에서 매달린 별·달 */}
      <Hanging x={78} len={150} kind="star" delay={0} />
      <Hanging x={112} len={118} kind="moon" delay={1.2} />
      <Hanging x={262} len={124} kind="star" delay={0.6} />
      <Hanging x={300} len={96} kind="star" delay={1.8} />

      {/* 휘장 */}
      <Drape id={`${ID}-dl`} side="left" color="#4a1a6e" dark="#1e0a36" />
      <Drape id={`${ID}-dr`} side="right" color="#4a1a6e" dark="#1e0a36" />

      {/* 수정구 */}
      <circle cx={BX} cy={BY} r={BR * 1.9} fill={`url(#${ID}-aura)`} className="hb-pulse" style={v({ "--d": "6s" })} />
      <circle cx={BX} cy={BY} r={BR} fill={`url(#${ID}-ball)`} />
      <g clipPath={`url(#${ID}-in)`}>
        <g className="hb-spin" style={v({ "--d": "40s", transformOrigin: `${BX}px ${BY}px` })}>
          <Nebula id={`${ID}-i1`} cx={BX - 10} cy={BY + 6} rx={70} ry={60} color="#ff7ad8" seed={81} freq={0.03} cut={0.48} opacity={0.9} />
          <Nebula id={`${ID}-i2`} cx={BX + 14} cy={BY - 10} rx={60} ry={50} color="#5ad8ff" seed={87} freq={0.034} cut={0.5} opacity={0.85} />
          {/* 소용돌이치는 빛 덩어리 */}
          {[
            [-22, 10, 30, "#ff6ad0"],
            [24, -14, 28, "#4ad8ff"],
            [6, 26, 20, "#b98aff"],
            [-14, -26, 18, "#ffd08a"],
          ].map(([dx, dy, r, c], i) => (
            <circle key={i} cx={BX + Number(dx)} cy={BY + Number(dy)} r={Number(r)} fill={String(c)} opacity=".6" filter={`url(#${ID}-haze)`} />
          ))}
          {Array.from({ length: 3 }, (_, k) => (
            <path key={k} d={`M${BX} ${BY} ${Array.from({ length: 30 }, (_, i) => { const a = i * 0.35 + (k * Math.PI * 2) / 3; const r = i * 1.9; return `L${BX + Math.cos(a) * r} ${BY + Math.sin(a) * r * 0.8}`; }).join(" ")}`} stroke="#fff3fb" strokeWidth=".7" fill="none" opacity=".22" filter={`url(#${ID}-soft)`} />
          ))}
        </g>
        <StarField seed={91} n={40} x={[BX - BR, BX + BR]} y={[BY - BR, BY + BR]} size={[0.3, 1.1]} halo={0.15} />
        <circle cx={BX} cy={BY} r={14} fill="#fff6ff" opacity=".55" filter={`url(#${ID}-soft)`} />
        {/* 안쪽 아래 반사 */}
        <ellipse cx={BX} cy={BY + BR * 0.7} rx={BR * 0.7} ry={BR * 0.25} fill="#c9a8ff" opacity=".25" />
      </g>
      {/* 유리 반사광 */}
      <path d={`M${BX - BR * 0.72} ${BY - BR * 0.2}A${BR * 0.78} ${BR * 0.78} 0 0 1 ${BX - BR * 0.1} ${BY - BR * 0.76}`} stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".55" />
      <circle cx={BX - BR * 0.42} cy={BY - BR * 0.5} r="4" fill="#fff" opacity=".85" />
      <circle cx={BX} cy={BY} r={BR} fill="none" stroke="#e8dcff" strokeWidth="1.4" opacity=".7" />
      <Glint x={BX + BR * 0.45} y={BY + BR * 0.38} r={1.2} d={3} />

      {/* 금빛 받침 */}
      <g>
        <ellipse cx={BX} cy={BY + BR - 4} rx={36} ry={8} fill={`url(#${ID}-gold)`} />
        {[-1, 0, 1].map((k) => (
          <path key={k} d={`M${BX + k * 24} ${BY + BR - 6}Q${BX + k * 40} ${BY + BR + 14} ${BX + k * 18} ${BY + BR + 30}`} stroke={`url(#${ID}-gold)`} strokeWidth="5" fill="none" strokeLinecap="round" />
        ))}
        <path d={`M${BX - 30} ${BY + BR + 30}H${BX + 30}L${BX + 40} ${BY + BR + 46}H${BX - 40}Z`} fill={`url(#${ID}-gold)`} />
        <rect x={BX - 44} y={BY + BR + 46} width="88" height="7" rx="2" fill="#6a4018" />
        {[-24, 0, 24].map((dx) => (
          <circle key={dx} cx={BX + dx} cy={BY + BR + 38} r="3.2" fill={dx ? "#ff7aa8" : "#7ad8ff"} />
        ))}
      </g>

      {/* 떠 있는 카드 */}
      <TarotCard id={`${ID}-c1`} x={54} y={196} w={40} rot={-16} art="eye" numeral="II" title="여사제" delay={0.4} />
      <TarotCard id={`${ID}-c2`} x={282} y={200} w={40} rot={16} art="star" numeral="XVII" title="별" delay={1.6} />

      {/* 탁자: 수놓은 탁자보 + 술 */}
      <ellipse cx={BX} cy={448} rx={240} ry={44} fill={`url(#${ID}-cloth)`} />
      <ellipse cx={BX} cy={448} rx={200} ry={32} fill="none" stroke={GOLD} strokeWidth="1" opacity=".7" strokeDasharray="4 3" />
      <ellipse cx={BX} cy={448} rx={120} ry={18} fill="none" stroke={GOLD} strokeWidth="1.2" opacity=".75" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const x = BX + Math.cos(a) * 160;
        const y = 448 + Math.sin(a) * 25;
        return <path key={i} d={`M${x} ${y - 3}l1 2l2.4 .4l-1.8 1.6l.6 2.4l-2.2 -1.2l-2.2 1.2l.6 -2.4l-1.8 -1.6l2.4 -.4Z`} fill={GOLD} opacity=".85" />;
      })}
      <path d="M-53 448 Q187 540 427 448 V520 H-53Z" fill="#170a30" />
      {Array.from({ length: 26 }, (_, i) => {
        const x = -40 + i * 18;
        const t = (x - BX) / 240;
        const y = 448 + Math.sqrt(Math.max(0, 1 - t * t)) * 44;
        return (
          <g key={i}>
            <path d={`M${x - 8} ${y}Q${x} ${y + 9} ${x + 8} ${y}`} stroke={GOLD} strokeWidth="1.2" fill="none" />
            <line x1={x} y1={y + 4} x2={x} y2={y + 12} stroke={GOLD} strokeWidth=".8" />
          </g>
        );
      })}
      {/* 탁자 위 펼친 카드 (원근으로 눕힘) */}
      {[
        [54, 444, -10],
        [80, 452, 4],
        [292, 452, -4],
        [318, 444, 10],
      ].map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) skewX(-20) scale(1 .45)`}>
          <rect x="-12" y="-20" width="24" height="40" rx="3" fill="#2a1666" stroke={GOLD} strokeWidth="1.6" />
          <circle cx="0" cy="0" r="6" fill="none" stroke={GOLD} strokeWidth="1.2" />
        </g>
      ))}
      <Candle id={`${ID}-k1`} x={34} y={438} h={30} delay={0.3} />
      <Candle id={`${ID}-k2`} x={344} y={438} h={26} delay={0.9} />
      <Candle id={`${ID}-k3`} x={124} y={432} h={14} w={6} delay={0.5} />
      {/* 향로와 연기 */}
      <g>
        <ellipse cx="252" cy="434" rx="10" ry="3" fill="#6a4018" />
        <path d="M244 434 Q252 446 260 434Z" fill={`url(#${ID}-gold)`} />
        <g className="hb-drift" style={v({ "--d": "7s" })} filter={`url(#${ID}-soft)`} opacity=".5">
          <path d="M252 430 C246 410 260 396 252 378 C244 360 258 346 252 326" stroke="#d8c8ff" strokeWidth="4" fill="none" />
          <path d="M254 428 C262 412 248 400 256 384 C264 368 250 356 258 340" stroke="#f0d8ff" strokeWidth="2.5" fill="none" />
        </g>
      </g>
      <Fireflies seed={97} n={20} x={[20, 355]} y={[260, 430]} color="#ffd98a" size={1} />
      {/* 받침 아래 빛 번짐 */}
      <ellipse cx={BX} cy={BY + BR + 56} rx={70} ry={8} fill="#ffcf7a" opacity=".2" filter={`url(#${ID}-soft)`} />
    </Scene>
  );
}
