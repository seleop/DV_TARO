/**
 * 홈 배경: 타로 점술사의 성소 (2026-10-25 사용자 결정: 시안 2 "타로의 성소" + 시안 6 "점술사의 수정구"를 섞음).
 * 성운 하늘 · 별의 문(빛 소용돌이와 별 고리) 한가운데 금빛 받침의 수정구 · 흑백 기둥 · 휘장 · 매달린 별과 달 ·
 * 수정구 양옆에 떠 있는 타로 네 장 · 마법진 무대 바닥과 펼친 카드 · 촛불 · 향 연기 · 금빛 먼지.
 * 주인공(수정구)은 말풍선 아래·별이 머리 위에 둔다. 좌표계·움직임 규칙은 ./common.
 */
import { Fireflies, Glint, Nebula, Scene, ShootingStar, StarField, cos, polar, sin, v } from "./common";
import { Candle, Drape, TarotCard } from "./art";

const ID = "hs";
const GOLD = "#f4d38a";
const BX = 187;
const BY = 214;
const BR = 58;

export function SanctumBackdrop() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0424" />
          <stop offset=".4" stopColor="#25104e" />
          <stop offset=".75" stopColor="#4c1a70" />
          <stop offset="1" stopColor="#6a2478" />
        </linearGradient>
        <radialGradient id={`${ID}-portal`}>
          <stop offset="0" stopColor="#fff6e0" stopOpacity=".7" />
          <stop offset=".22" stopColor="#ffc6f0" stopOpacity=".45" />
          <stop offset=".5" stopColor="#9a6cff" stopOpacity=".28" />
          <stop offset=".82" stopColor="#3a1a8a" stopOpacity=".1" />
          <stop offset="1" stopColor="#3a1a8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${ID}-pillarD`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c0622" />
          <stop offset=".55" stopColor="#2a1850" />
          <stop offset="1" stopColor="#0c0622" />
        </linearGradient>
        <linearGradient id={`${ID}-pillarL`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a7ab0" />
          <stop offset=".45" stopColor="#f4ecff" />
          <stop offset="1" stopColor="#9a88c0" />
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
        <linearGradient id={`${ID}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1450" />
          <stop offset="1" stopColor="#12082c" />
        </linearGradient>
        <radialGradient id={`${ID}-floorGlow`}>
          <stop offset="0" stopColor="#ffcf7a" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 하늘과 성운 */}
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={100} cy={150} rx={190} ry={140} color="#ff5fc0" seed={4} freq={0.011} cut={0.52} opacity={0.75} />
      <Nebula id={`${ID}-n2`} cx={290} cy={250} rx={180} ry={150} color="#6a7cff" seed={12} freq={0.012} cut={0.52} opacity={0.7} />
      <Nebula id={`${ID}-n3`} cx={190} cy={120} rx={150} ry={80} color="#ffb35a" seed={27} freq={0.018} cut={0.6} opacity={0.45} />
      <Nebula id={`${ID}-n4`} cx={190} cy={250} rx={220} ry={60} color="#1a0838" seed={33} freq={0.025} cut={0.52} density={2.2} blend="normal" opacity={0.55} rotate={12} />
      <StarField seed={21} n={260} y={[0, 430]} size={[0.25, 1.15]} halo={0.06} />
      <Glint x={70} y={96} r={1.4} />
      <Glint x={318} y={128} r={1.6} delay={1.8} color="#ffe7b8" />
      <Glint x={140} y={330} r={1} delay={2.4} color="#ffd6f0" />
      <ShootingStar id={`${ID}-s1`} x={60} y={70} delay={2} />

      {/* 별의 문: 빛 소용돌이 + 별로 된 고리 (수정구 둘레) */}
      <circle cx={BX} cy={BY} r={150} fill={`url(#${ID}-portal)`} className="hb-pulse" style={v({ "--d": "8s" })} />
      <g className="hb-spin" style={v({ "--d": "70s", transformOrigin: `${BX}px ${BY}px` })} opacity=".7">
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx={BX} cy={BY} rx={70 + i * 14} ry={60 + i * 12} fill="none" stroke={i % 2 ? "#ffc6f0" : "#b9a6ff"} strokeWidth={0.6 + (i % 3) * 0.3} strokeDasharray={`${8 + i * 6} ${10 + i * 4}`} transform={`rotate(${i * 27} ${BX} ${BY})`} />
        ))}
      </g>
      <g className="hb-spin-r" style={v({ "--d": "140s", transformOrigin: `${BX}px ${BY}px` })} filter={`url(#${ID}-glow)`}>
        {Array.from({ length: 48 }, (_, i) => {
          const [x, y] = polar(BX, BY, 140, i * 7.5);
          return <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 2.1 : 1} fill={i % 4 === 0 ? "#fff6d8" : GOLD} />;
        })}
        <circle cx={BX} cy={BY} r={130} fill="none" stroke={GOLD} strokeWidth=".7" strokeDasharray="2 4" />
      </g>

      {/* 흑백 기둥 (왼쪽 어둠·오른쪽 빛) */}
      {[
        { x: 22, fill: `url(#${ID}-pillarD)`, mark: "moon" as const },
        { x: 319, fill: `url(#${ID}-pillarL)`, mark: "sun" as const },
      ].map(({ x, fill, mark }) => (
        <g key={x}>
          <rect x={x} y={150} width={34} height={320} fill={fill} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <line key={k} x1={x + 5 + k * 5} y1={158} x2={x + 5 + k * 5} y2={462} stroke="#000" strokeOpacity=".12" strokeWidth="1.4" />
          ))}
          <rect x={x - 6} y={140} width={46} height={12} rx="2" fill={fill} stroke={GOLD} strokeWidth="1.2" />
          <path d={`M${x - 8} ${140} Q${x + 17} ${120} ${x + 42} ${140}`} fill={fill} stroke={GOLD} strokeWidth="1.2" />
          <rect x={x - 4} y={464} width={42} height={10} fill={fill} stroke={GOLD} strokeWidth="1.2" />
          {[176, 300, 440].map((y) => (
            <rect key={y} x={x} y={y} width={34} height={3} fill={GOLD} opacity=".85" />
          ))}
          <g filter={`url(#${ID}-glow)`}>
            {mark === "moon" ? (
              <path d={`M${x + 20} ${222}a9 9 0 1 0 6 15a7 7 0 1 1 -6 -15Z`} fill={GOLD} />
            ) : (
              <g>
                <circle cx={x + 17} cy={232} r="6" fill={GOLD} />
                {Array.from({ length: 8 }, (_, k) => {
                  const [a, b] = polar(x + 17, 232, 8, k * 45);
                  const [c, d] = polar(x + 17, 232, 12, k * 45);
                  return <line key={k} x1={a} y1={b} x2={c} y2={d} stroke={GOLD} strokeWidth="1.2" />;
                })}
              </g>
            )}
          </g>
        </g>
      ))}

      {/* 위에서 매달린 별·달 */}
      <Hanging x={86} len={128} kind="star" delay={0} />
      <Hanging x={120} len={100} kind="moon" delay={1.2} />
      <Hanging x={254} len={106} kind="star" delay={0.6} />
      <Hanging x={290} len={86} kind="moon" delay={1.8} />

      {/* 휘장 */}
      <Drape id={`${ID}-dl`} side="left" />
      <Drape id={`${ID}-dr`} side="right" />

      {/* 수정구 */}
      <circle cx={BX} cy={BY} r={BR * 1.9} fill={`url(#${ID}-aura)`} className="hb-pulse" style={v({ "--d": "6s" })} />
      <circle cx={BX} cy={BY} r={BR} fill={`url(#${ID}-ball)`} />
      <g clipPath={`url(#${ID}-in)`}>
        <g className="hb-spin" style={v({ "--d": "40s", transformOrigin: `${BX}px ${BY}px` })}>
          <Nebula id={`${ID}-i1`} cx={BX - 10} cy={BY + 6} rx={64} ry={56} color="#ff7ad8" seed={81} freq={0.03} cut={0.48} opacity={0.9} />
          <Nebula id={`${ID}-i2`} cx={BX + 14} cy={BY - 10} rx={56} ry={46} color="#5ad8ff" seed={87} freq={0.034} cut={0.5} opacity={0.85} />
          {/* 소용돌이치는 빛 덩어리 */}
          {(
            [
              [-20, 9, 27, "#ff6ad0"],
              [22, -13, 25, "#4ad8ff"],
              [6, 24, 18, "#b98aff"],
              [-13, -24, 16, "#ffd08a"],
            ] as const
          ).map(([dx, dy, r, c], i) => (
            <circle key={i} cx={BX + dx} cy={BY + dy} r={r} fill={c} opacity=".6" filter={`url(#${ID}-haze)`} />
          ))}
          {Array.from({ length: 3 }, (_, k) => (
            <path
              key={k}
              d={`M${BX} ${BY} ${Array.from({ length: 28 }, (_, i) => {
                const a = i * 0.35 + (k * Math.PI * 2) / 3;
                const r = i * 1.8;
                return `L${BX + cos(a) * r} ${BY + sin(a) * r * 0.8}`;
              }).join(" ")}`}
              stroke="#fff3fb"
              strokeWidth=".7"
              fill="none"
              opacity=".22"
              filter={`url(#${ID}-soft)`}
            />
          ))}
        </g>
        <StarField seed={91} n={36} x={[BX - BR, BX + BR]} y={[BY - BR, BY + BR]} size={[0.3, 1.1]} halo={0.15} />
        <circle cx={BX} cy={BY} r={13} fill="#fff6ff" opacity=".55" filter={`url(#${ID}-soft)`} />
        <ellipse cx={BX} cy={BY + BR * 0.7} rx={BR * 0.7} ry={BR * 0.25} fill="#c9a8ff" opacity=".25" />
      </g>
      {/* 유리 반사광 */}
      <path d={`M${BX - BR * 0.72} ${BY - BR * 0.2}A${BR * 0.78} ${BR * 0.78} 0 0 1 ${BX - BR * 0.1} ${BY - BR * 0.76}`} stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".55" />
      <circle cx={BX - BR * 0.42} cy={BY - BR * 0.5} r="4" fill="#fff" opacity=".85" />
      <circle cx={BX} cy={BY} r={BR} fill="none" stroke="#e8dcff" strokeWidth="1.4" opacity=".7" />
      <Glint x={BX + BR * 0.45} y={BY + BR * 0.38} r={1.2} d={3} />
      {/* 금빛 받침 */}
      <g>
        <ellipse cx={BX} cy={BY + BR - 4} rx={33} ry={7.5} fill={`url(#${ID}-gold)`} />
        {[-1, 0, 1].map((k) => (
          <path key={k} d={`M${BX + k * 22} ${BY + BR - 6}Q${BX + k * 37} ${BY + BR + 13} ${BX + k * 17} ${BY + BR + 28}`} stroke={`url(#${ID}-gold)`} strokeWidth="4.6" fill="none" strokeLinecap="round" />
        ))}
        <path d={`M${BX - 28} ${BY + BR + 28}H${BX + 28}L${BX + 37} ${BY + BR + 43}H${BX - 37}Z`} fill={`url(#${ID}-gold)`} />
        <rect x={BX - 41} y={BY + BR + 43} width="82" height="6.5" rx="2" fill="#6a4018" />
        {[-22, 0, 22].map((dx) => (
          <circle key={dx} cx={BX + dx} cy={BY + BR + 35.5} r="3" fill={dx ? "#ff7aa8" : "#7ad8ff"} />
        ))}
      </g>
      <ellipse cx={BX} cy={BY + BR + 52} rx={66} ry={7} fill="#ffcf7a" opacity=".2" filter={`url(#${ID}-soft)`} />

      {/* 수정구 양옆에 떠 있는 타로 네 장 */}
      <TarotCard id={`${ID}-c1`} x={34} y={212} w={44} rot={-16} art="moon" numeral="XVIII" title="달" delay={0} />
      <TarotCard id={`${ID}-c2`} x={80} y={158} w={40} rot={-8} art="star" numeral="XVII" title="별" delay={1.2} />
      <TarotCard id={`${ID}-c3`} x={255} y={158} w={40} rot={8} art="wheel" numeral="X" title="운명의 수레바퀴" delay={1.8} />
      <TarotCard id={`${ID}-c4`} x={297} y={212} w={44} rot={16} art="world" numeral="XXI" title="세계" delay={2.4} />

      {/* 무대 바닥: 타일 + 금빛 마법진 + 펼친 카드 */}
      <path d="M0 440 Q187 418 375 440 V520 H0Z" fill={`url(#${ID}-floor)`} />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={187 + (i - 6) * 34} y1={432} x2={187 + (i - 6) * 90} y2={520} stroke="#4a2a7a" strokeWidth=".8" opacity=".7" />
      ))}
      {[452, 470, 494].map((y) => (
        <line key={y} x1="0" y1={y} x2="375" y2={y} stroke="#4a2a7a" strokeWidth=".8" opacity=".6" />
      ))}
      <ellipse cx={BX} cy={470} rx={170} ry={36} fill={`url(#${ID}-floorGlow)`} />
      <g filter={`url(#${ID}-glow)`}>
        <ellipse cx={BX} cy={470} rx={128} ry={22} fill="none" stroke={GOLD} strokeWidth="1.4" />
        <ellipse cx={BX} cy={470} rx={108} ry={17} fill="none" stroke={GOLD} strokeWidth=".7" strokeDasharray="3 3" />
        <ellipse cx={BX} cy={470} rx={70} ry={11} fill="none" stroke={GOLD} strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={BX + cos(a) * 118} cy={470 + sin(a) * 19.5} r="1.6" fill="#fff6d8" />;
        })}
      </g>
      <path d="M0 440 Q187 418 375 440" stroke={GOLD} strokeWidth="1.2" fill="none" opacity=".7" />
      {(
        [
          [112, 492, -12],
          [138, 500, 3],
          [238, 500, -3],
          [264, 492, 12],
        ] as const
      ).map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) skewX(-20) scale(1 .45)`}>
          <rect x="-12" y="-20" width="24" height="40" rx="3" fill="#2a1666" stroke={GOLD} strokeWidth="1.6" />
          <circle cx="0" cy="0" r="6" fill="none" stroke={GOLD} strokeWidth="1.2" />
        </g>
      ))}
      <Candle id={`${ID}-k1`} x={66} y={462} h={30} delay={0.2} />
      <Candle id={`${ID}-k2`} x={88} y={474} h={18} w={7} delay={0.7} />
      <Candle id={`${ID}-k3`} x={308} y={462} h={28} delay={0.4} />
      <Candle id={`${ID}-k4`} x={288} y={476} h={16} w={7} delay={1.1} />
      {/* 향로와 연기 */}
      <g>
        <ellipse cx="338" cy="478" rx="10" ry="3" fill="#6a4018" />
        <path d="M330 478 Q338 490 346 478Z" fill={`url(#${ID}-gold)`} />
        <g className="hb-drift" style={v({ "--d": "7s" })} filter={`url(#${ID}-soft)`} opacity=".5">
          <path d="M338 474 C332 454 346 440 338 422 C330 404 344 390 338 370" stroke="#d8c8ff" strokeWidth="4" fill="none" />
          <path d="M340 472 C348 456 334 444 342 428 C350 412 336 400 344 384" stroke="#f0d8ff" strokeWidth="2.5" fill="none" />
        </g>
      </g>
      <Fireflies seed={7} n={26} x={[20, 355]} y={[250, 470]} color="#ffd98a" size={1.1} />
    </Scene>
  );
}

/** 위에서 금실에 매달려 흔들리는 별·달 장식 */
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
