/** 시안 2. 타로의 성소: 성운 속 별의 문(포털), 흑백 기둥, 금빛 휘장, 떠 있는 타로 다섯 장, 마법진 무대 바닥과 촛불 */
import { Fireflies, Glint, Nebula, Scene, ShootingStar, StarField, polar, v } from "./common";
import { Candle, Drape, TarotCard } from "./art";

const ID = "t2";
const GOLD = "#f4d38a";
const CX = 187;
const CY = 236;

export function TarotSanctum() {
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
          <stop offset="0" stopColor="#fff6e0" stopOpacity=".95" />
          <stop offset=".18" stopColor="#ffc6f0" stopOpacity=".6" />
          <stop offset=".45" stopColor="#9a6cff" stopOpacity=".32" />
          <stop offset=".8" stopColor="#3a1a8a" stopOpacity=".1" />
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
        <linearGradient id={`${ID}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1450" />
          <stop offset="1" stopColor="#12082c" />
        </linearGradient>
        <radialGradient id={`${ID}-floorGlow`}>
          <stop offset="0" stopColor="#ffcf7a" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
      </defs>
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

      {/* 별의 문: 빛 소용돌이 + 별로 된 고리 */}
      <circle cx={CX} cy={CY} r={150} fill={`url(#${ID}-portal)`} className="hb-pulse" style={v({ "--d": "8s" })} />
      <g className="hb-spin" style={v({ "--d": "70s", transformOrigin: `${CX}px ${CY}px` })} opacity=".75">
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx={CX} cy={CY} rx={36 + i * 18} ry={30 + i * 15} fill="none" stroke={i % 2 ? "#ffc6f0" : "#b9a6ff"} strokeWidth={0.6 + (i % 3) * 0.3} strokeDasharray={`${8 + i * 6} ${10 + i * 4}`} transform={`rotate(${i * 27} ${CX} ${CY})`} />
        ))}
      </g>
      <g className="hb-spin-r" style={v({ "--d": "140s", transformOrigin: `${CX}px ${CY}px` })} filter={`url(#${ID}-glow)`}>
        {Array.from({ length: 48 }, (_, i) => {
          const [x, y] = polar(CX, CY, 138, i * 7.5);
          return <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 2.1 : 1} fill={i % 4 === 0 ? "#fff6d8" : GOLD} />;
        })}
        <circle cx={CX} cy={CY} r={128} fill="none" stroke={GOLD} strokeWidth=".7" strokeDasharray="2 4" />
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

      {/* 휘장 */}
      <Drape id={`${ID}-dl`} side="left" />
      <Drape id={`${ID}-dr`} side="right" />

      {/* 떠 있는 타로 다섯 장 (말풍선 아래, 별이 머리 위) */}
      <TarotCard id={`${ID}-c1`} x={56} y={196} w={46} rot={-20} art="moon" numeral="XVIII" title="달" delay={0} />
      <TarotCard id={`${ID}-c2`} x={106} y={150} w={50} rot={-9} art="star" numeral="XVII" title="별" delay={1.2} />
      <TarotCard id={`${ID}-c3`} x={163} y={130} w={52} rot={0} art="sun" numeral="XIX" title="해" delay={0.6} d={7} />
      <TarotCard id={`${ID}-c4`} x={220} y={150} w={50} rot={9} art="wheel" numeral="X" title="운명의 수레바퀴" delay={1.8} />
      <TarotCard id={`${ID}-c5`} x={274} y={196} w={46} rot={20} art="world" numeral="XXI" title="세계" delay={2.4} />

      {/* 무대 바닥: 타일 + 금빛 마법진 */}
      <path d="M0 440 Q187 418 375 440 V520 H0Z" fill={`url(#${ID}-floor)`} />
      {Array.from({ length: 13 }, (_, i) => (
        <line key={i} x1={187 + (i - 6) * 34} y1={432} x2={187 + (i - 6) * 90} y2={520} stroke="#4a2a7a" strokeWidth=".8" opacity=".7" />
      ))}
      {[452, 470, 494].map((y) => (
        <line key={y} x1="0" y1={y} x2="375" y2={y} stroke="#4a2a7a" strokeWidth=".8" opacity=".6" />
      ))}
      <ellipse cx={CX} cy={470} rx={170} ry={36} fill={`url(#${ID}-floorGlow)`} />
      <g filter={`url(#${ID}-glow)`}>
        <ellipse cx={CX} cy={470} rx={128} ry={22} fill="none" stroke={GOLD} strokeWidth="1.4" />
        <ellipse cx={CX} cy={470} rx={108} ry={17} fill="none" stroke={GOLD} strokeWidth=".7" strokeDasharray="3 3" />
        <ellipse cx={CX} cy={470} rx={70} ry={11} fill="none" stroke={GOLD} strokeWidth="1" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={CX + Math.cos(a) * 118} cy={470 + Math.sin(a) * 19.5} r="1.6" fill="#fff6d8" />;
        })}
      </g>
      <path d="M0 440 Q187 418 375 440" stroke={GOLD} strokeWidth="1.2" fill="none" opacity=".7" />
      <Candle id={`${ID}-k1`} x={66} y={462} h={30} delay={0.2} />
      <Candle id={`${ID}-k2`} x={88} y={474} h={18} w={7} delay={0.7} />
      <Candle id={`${ID}-k3`} x={308} y={462} h={28} delay={0.4} />
      <Candle id={`${ID}-k4`} x={288} y={476} h={16} w={7} delay={1.1} />
      <Fireflies seed={7} n={26} x={[20, 355]} y={[250, 470]} color="#ffd98a" size={1.1} />
    </Scene>
  );
}
