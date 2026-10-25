/**
 * 홈 배경: 별이네 밤하늘 점집 입구 (2026-10-25 사용자 결정: 홈은 네 기능을 아우르는 새 배경).
 * 성운·은하수 하늘과 초승달 · 멀리 언덕의 작은 천막 마을 불빛 · 금빛 술 장식 줄무늬 큰 천막 ·
 * 열린 문 안의 따뜻한 빛(마스코트 뒤를 비춤) · 문 위 '占' 간판 · 사주·타로·별자리 깃발 · 꼬마전구 줄과 등불 기둥 ·
 * 문까지 이어진 빛나는 징검돌 길 · 화분·풀·반딧불·안개.
 * 좌표계·움직임 규칙은 ./common (장면 375×520, 아래 기준으로 잘라 맞춤).
 */
import { Fireflies, Glint, Mist, Nebula, Scene, ShootingStar, StarField, v } from "./common";
import { CrescentMoon } from "./art";

const ID = "hp";
const GOLD = "#f4d38a";
const CX = 187;

export function PorchBackdrop() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060826" />
          <stop offset=".38" stopColor="#171654" />
          <stop offset=".64" stopColor="#3a2378" />
          <stop offset=".82" stopColor="#7a3a86" />
          <stop offset="1" stopColor="#b45a86" />
        </linearGradient>
        <linearGradient id={`${ID}-stripeA`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a1456" />
          <stop offset=".5" stopColor="#4a2486" />
          <stop offset="1" stopColor="#2a1456" />
        </linearGradient>
        <linearGradient id={`${ID}-stripeB`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a1f5e" />
          <stop offset=".5" stopColor="#8a3a7e" />
          <stop offset="1" stopColor="#5a1f5e" />
        </linearGradient>
        <radialGradient id={`${ID}-door`} cx=".5" cy=".7" r=".8">
          <stop offset="0" stopColor="#fff2c8" />
          <stop offset=".35" stopColor="#ffc070" />
          <stop offset=".75" stopColor="#d86a4a" />
          <stop offset="1" stopColor="#5a1f4a" />
        </radialGradient>
        <radialGradient id={`${ID}-spill`}>
          <stop offset="0" stopColor="#ffc070" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffc070" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${ID}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1a52" />
          <stop offset="1" stopColor="#120b30" />
        </linearGradient>
        <clipPath id={`${ID}-tentBody`}>
          <path d="M44 206 L331 206 L344 440 L30 440 Z" />
        </clipPath>
        <clipPath id={`${ID}-roof`}>
          <path d={`M${CX} 92 L344 206 L30 206 Z`} />
        </clipPath>
      </defs>

      {/* 하늘·성운·은하수 */}
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={70} cy={110} rx={170} ry={110} color="#ff5fb8" seed={61} freq={0.012} cut={0.58} opacity={0.5} />
      <Nebula id={`${ID}-n2`} cx={320} cy={150} rx={160} ry={110} color="#5a8cff" seed={66} freq={0.012} cut={0.58} opacity={0.5} />
      <Nebula id={`${ID}-mw`} cx={190} cy={120} rx={260} ry={46} rotate={-18} color="#d9c8ff" seed={68} freq={0.018} cut={0.52} opacity={0.6} />
      <StarField seed={71} n={230} y={[0, 360]} size={[0.25, 1.1]} halo={0.06} />
      <StarField seed={72} n={200} size={[0.2, 0.8]} band={{ x1: -30, y1: 190, x2: 410, y2: 40, w: 26 }} halo={0.02} />
      <CrescentMoon id={`${ID}-moon`} x={318} y={70} r={16} />
      <Glint x={52} y={64} r={1.5} />
      <Glint x={250} y={36} r={1.2} delay={1.6} color="#ffe7b8" />
      <Glint x={30} y={250} r={1.1} delay={2.7} color="#cfe4ff" />
      <ShootingStar id={`${ID}-s1`} x={40} y={40} delay={2} />

      {/* 먼 언덕과 작은 천막 마을 불빛 */}
      <path d="M0 330 Q60 300 120 318 T240 306 T375 316 V420 H0Z" fill="#2c1c5e" />
      {[
        [28, 312, 14],
        [84, 306, 10],
        [292, 300, 12],
        [344, 308, 15],
      ].map(([x, y, s], i) => (
        <g key={i}>
          <path d={`M${x - s} ${y + s * 0.9} L${x} ${y - s * 0.4} L${x + s} ${y + s * 0.9} Z`} fill="#3c2470" />
          <rect x={x - s * 0.22} y={y + s * 0.3} width={s * 0.44} height={s * 0.6} fill="#ffcf7a" opacity=".85" className="hb-tw" style={v({ "--d": `${3 + i}s` })} />
        </g>
      ))}
      <Mist id={ID} y={330} color="#c9a8ff" opacity={0.35} d={44} />

      {/* 꼬마전구 줄 (기둥 ↔ 천막) */}
      {(
        [
          [0, 168, 70, 214],
          [305, 214, 375, 168],
        ] as const
      ).map(([x1, y1, x2, y2], i) => {
        const mx = (x1 + x2) / 2;
        const my = Math.max(y1, y2) + 26;
        return (
          <g key={i}>
            <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} stroke="#2a1a40" strokeWidth="1" fill="none" />
            {Array.from({ length: 7 }, (_, k) => {
              const t = (k + 0.5) / 7;
              const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
              const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
              const c = ["#ffd98a", "#ff9ad6", "#9ad8ff"][k % 3];
              return (
                <g key={k} className="hb-tw" style={v({ "--d": `${2 + (k % 3)}s`, animationDelay: `${k * 0.3}s` })}>
                  <circle cx={x} cy={y + 3} r="5" fill={c} opacity=".25" />
                  <circle cx={x} cy={y + 3} r="2" fill={c} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 큰 천막: 지붕(줄무늬 원뿔) + 몸(줄무늬) + 금빛 술 장식 */}
      <g clipPath={`url(#${ID}-roof)`}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = 30 + (i * 314) / 12;
          const b = 30 + ((i + 1) * 314) / 12;
          return <path key={i} d={`M${CX} 92 L${b} 206 L${a} 206 Z`} fill={`url(#${ID}-stripe${i % 2 ? "B" : "A"})`} />;
        })}
      </g>
      <path d={`M${CX} 92 L344 206 M${CX} 92 L30 206`} stroke={GOLD} strokeWidth="1.4" opacity=".8" />
      {/* 꼭대기 깃발 */}
      <line x1={CX} y1={92} x2={CX} y2={60} stroke={GOLD} strokeWidth="1.6" />
      <g className="hb-sway" style={v({ "--d": "3.6s", transformOrigin: `${CX}px 62px`, transformBox: "view-box" })}>
        <path d={`M${CX} 61 Q${CX + 14} 58 ${CX + 26} 64 Q${CX + 14} 68 ${CX} 72 Z`} fill="#ff7aa8" />
        <path d={`M${CX + 9} 63.5l1 2.2l2.4.3l-1.8 1.6l.6 2.4l-2.2-1.3l-2.2 1.3l.6-2.4l-1.8-1.6l2.4-.3z`} fill={GOLD} />
      </g>
      <circle cx={CX} cy={58} r="3" fill={GOLD} />
      <g clipPath={`url(#${ID}-tentBody)`}>
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={30 + i * 24.5} y={206} width={24.5} height={240} fill={`url(#${ID}-stripe${i % 2 ? "B" : "A"})`} />
        ))}
        {/* 아래로 갈수록 그늘 */}
        <rect x="0" y="330" width="375" height="120" fill="#0c0626" opacity=".35" />
      </g>
      {/* 술 장식 띠 (물결 + 방울) */}
      <path
        d={`M30 206 ${Array.from({ length: 14 }, (_, i) => `Q${30 + i * 22.4 + 11.2} 226 ${30 + (i + 1) * 22.4} 206`).join(" ")} L344 206 L344 200 L30 200 Z`}
        fill="#f0b850"
      />
      <path d={`M30 200 H344`} stroke="#ffe6a8" strokeWidth="1.2" />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={30 + i * 22.4 + 11.2} cy={220} r="2.6" fill="#ffe6a8" />
      ))}

      {/* 열린 문: 안쪽 따뜻한 빛 + 걷어 묶은 휘장 */}
      <path d={`M${CX - 62} 440 L${CX - 62} 288 Q${CX - 62} 236 ${CX} 232 Q${CX + 62} 236 ${CX + 62} 288 L${CX + 62} 440 Z`} fill={`url(#${ID}-door)`} />
      {/* 문 안: 멀리 작은 탁자와 수정구 빛 */}
      <ellipse cx={CX} cy={348} rx={26} ry={5} fill="#7a2a4a" opacity=".7" />
      <rect x={CX - 3} y={348} width={6} height={22} fill="#6a2440" opacity=".7" />
      <circle cx={CX} cy={338} r={8} fill="#e8d8ff" opacity=".7" />
      <g opacity=".25">
        <circle cx={CX} cy={338} r={20} fill="#e8d8ff" className="hb-pulse" style={v({ "--d": "4s" })} />
      </g>
      {[-1, 1].map((k) => (
        <g key={k}>
          <path
            d={`M${CX + k * 62} 232 Q${CX + k * 38} 270 ${CX + k * 44} 312 Q${CX + k * 50} 360 ${CX + k * 64} 440 L${CX + k * 90} 440 L${CX + k * 90} 226 Z`}
            fill={k < 0 ? `url(#${ID}-stripeB)` : `url(#${ID}-stripeA)`}
          />
          <path d={`M${CX + k * 62} 232 Q${CX + k * 38} 270 ${CX + k * 44} 312 Q${CX + k * 50} 360 ${CX + k * 64} 440`} stroke={GOLD} strokeWidth="1.6" fill="none" />
          {/* 묶은 끈과 술 */}
          <path d={`M${CX + k * 44} 312 Q${CX + k * 66} 306 ${CX + k * 90} 314`} stroke={GOLD} strokeWidth="3" fill="none" />
          <g className="hb-sway" style={v({ "--d": "4.4s" })}>
            <circle cx={CX + k * 50} cy={318} r="3.4" fill={GOLD} />
            <path d={`M${CX + k * 50 - 3} 321 l-1 16 M${CX + k * 50} 321 v17 M${CX + k * 50 + 3} 321 l1 16`} stroke={GOLD} strokeWidth="1" />
          </g>
        </g>
      ))}
      {/* 간판: 둥근 판 + 占 + 초승달·별 */}
      <g className="hb-sway" style={v({ "--d": "6s", transformOrigin: `${CX}px 222px`, transformBox: "view-box" })}>
        <path d={`M${CX - 16} 222 L${CX - 12} 236 M${CX + 16} 222 L${CX + 12} 236`} stroke={GOLD} strokeWidth="1" />
        <circle cx={CX} cy={252} r={19} fill="#2a1456" stroke={GOLD} strokeWidth="2" />
        <circle cx={CX} cy={252} r={15} fill="none" stroke={GOLD} strokeWidth=".7" strokeDasharray="1.5 2" />
        <g filter={`url(#${ID}-glow)`}>
          <text x={CX} y={253} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill="#ffe6a8" fontFamily='"Noto Serif KR", "Apple SD Gothic Neo", "Malgun Gothic", serif'>
            占
          </text>
        </g>
        <path d={`M${CX - 26} 244a5 5 0 1 0 3 8a4 4 0 1 1 -3 -8Z`} fill={GOLD} />
        <path d={`M${CX + 25} 245l1 2.2l2.4.3l-1.8 1.6l.6 2.4l-2.2-1.3l-2.2 1.3l.6-2.4l-1.8-1.6l2.4-.3z`} fill={GOLD} />
      </g>
      {/* 기능 깃발 셋: 사주(두루마리) · 타로(카드) · 별자리(별) */}
      {(
        [
          [78, "#c0603a", "scroll"],
          [118, "#a03a7a", "card"],
          [256, "#3a6ab0", "star"],
          [296, "#6a3ab0", "moon"],
        ] as const
      ).map(([x, color, icon], i) => (
        <g key={i} className="hb-sway" style={v({ "--d": `${5 + (i % 2)}s`, animationDelay: `${-i}s`, transformOrigin: `${x}px 224px`, transformBox: "view-box" })}>
          <line x1={x} y1={222} x2={x} y2={228} stroke={GOLD} strokeWidth="1" />
          <path d={`M${x - 11} 228 H${x + 11} V256 L${x} 264 L${x - 11} 256 Z`} fill={color} stroke={GOLD} strokeWidth="1.1" />
          {icon === "scroll" && <path d={`M${x - 6} 238 h12 M${x - 6} 243 h12 M${x - 6} 248 h8`} stroke="#ffe6a8" strokeWidth="1.4" strokeLinecap="round" />}
          {icon === "card" && <rect x={x - 4.5} y={235} width={9} height={14} rx="1.5" fill="none" stroke="#ffe6a8" strokeWidth="1.4" />}
          {icon === "star" && <path d={`M${x} 236l2 4.4l4.8.5l-3.6 3.2l1.1 4.8l-4.3-2.5l-4.3 2.5l1.1-4.8l-3.6-3.2l4.8-.5z`} fill="#ffe6a8" />}
          {icon === "moon" && <path d={`M${x + 1} 236a6.5 6.5 0 1 0 4 11a5 5 0 1 1 -4 -11Z`} fill="#ffe6a8" />}
        </g>
      ))}

      {/* 양옆 등불 기둥 */}
      {[18, 357].map((x, i) => (
        <g key={x}>
          <rect x={x - 2.5} y={170} width={5} height={270} fill="#1c1236" />
          <path d={`M${x - 9} 168 H${x + 9} L${x + 6} 160 H${x - 6} Z`} fill="#2a1a4a" />
          <rect x={x - 7} y={168} width={14} height={18} rx="3" fill="#ffcf7a" className="hb-pulse" style={v({ "--d": `${3 + i}s` })} />
          <circle cx={x} cy={177} r={20} fill="#ffcf7a" opacity=".18" />
        </g>
      ))}

      {/* 땅: 문 앞 빛 웅덩이 + 징검돌 길 */}
      <path d="M0 430 Q187 412 375 430 V520 H0Z" fill={`url(#${ID}-ground)`} />
      <ellipse cx={CX} cy={448} rx={150} ry={34} fill={`url(#${ID}-spill)`} />
      {(
        [
          [CX, 452, 34, 7],
          [CX - 6, 474, 40, 8],
          [CX + 8, 500, 46, 9],
        ] as const
      ).map(([x, y, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#4a3474" />
          <ellipse cx={x} cy={y - 1.5} rx={rx - 4} ry={ry - 2.5} fill="#6a4a9a" />
          <g opacity=".2">
            <ellipse cx={x} cy={y - 1.5} rx={rx - 4} ry={ry - 2.5} fill="#ffd98a" className="hb-tw" style={v({ "--d": `${3 + i}s` })} />
          </g>
        </g>
      ))}
      {/* 화분 둘 */}
      {[62, 312].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 12} 436 H${x + 12} L${x + 9} 456 H${x - 9} Z`} fill="#8a4a3a" />
          <rect x={x - 13} y={433} width={26} height={5} rx="2" fill="#a85a44" />
          {[-8, -3, 2, 7].map((dx, k) => (
            <path key={k} d={`M${x + dx * 0.4} 434 Q${x + dx} ${418 - (k % 2) * 6} ${x + dx * 1.6} ${410 - (k % 2) * 8}`} stroke="#3a8a6a" strokeWidth="3" fill="none" strokeLinecap="round" className="hb-sway" style={v({ "--d": `${5 + k}s` })} />
          ))}
          {i === 0 && <circle cx={x + 4} cy={412} r="3" fill="#ff9ad6" />}
          {i === 1 && <circle cx={x - 3} cy={408} r="3" fill="#ffe08a" />}
        </g>
      ))}
      <Fireflies seed={73} n={22} x={[0, 375]} y={[330, 470]} color="#ffe6a0" />
    </Scene>
  );
}
