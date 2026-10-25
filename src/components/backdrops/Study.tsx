/**
 * 사주 풀이 배경: 달빛 한옥 서재 (2026-10-25 사용자 결정).
 * 서까래·단청 띠 천장 · 가운데 둥근 만월창 너머 보름달·구름·먼 산·소나무 가지 · 창살 문 ·
 * 왼쪽 천문도 병풍 · 오른쪽 서책·두루마리 책장과 매화 백자 · 청사초롱·오방색 매듭 ·
 * 마루 바닥 · 서안(펼친 사주책·붓·벼루) · 향로 연기 · 등불 먼지.
 * 좌표계·움직임 규칙은 ./common (장면 375×520, 아래 기준으로 잘라 맞춤).
 */
import { Baked, Fireflies, Glint, Nebula, Scene, StarField, polar, rng, v } from "./common";
import { FullMoon } from "./art";

const ID = "st";
const GOLD = "#f4d38a";
const WX = 187;
const WY = 214;
const WR = 92;
const OBANG = ["#2f6fd0", "#d83a3a", "#f2c23a", "#f4efe4", "#2a2430"]; // 청·적·황·백·흑

export function StudyBackdrop() {
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1a2e" />
          <stop offset=".6" stopColor="#3e2630" />
          <stop offset="1" stopColor="#4a2e2c" />
        </linearGradient>
        <radialGradient id={`${ID}-lampGlow`}>
          <stop offset="0" stopColor="#ffb86a" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffb86a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${ID}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1440" />
          <stop offset=".7" stopColor="#24346e" />
          <stop offset="1" stopColor="#3c4a86" />
        </linearGradient>
        <clipPath id={`${ID}-window`}>
          <circle cx={WX} cy={WY} r={WR} />
        </clipPath>
        <linearGradient id={`${ID}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a3e24" />
          <stop offset="1" stopColor="#3a2014" />
        </linearGradient>
        <linearGradient id={`${ID}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3420" />
          <stop offset="1" stopColor="#2a160e" />
        </linearGradient>
        <linearGradient id={`${ID}-screen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14204a" />
          <stop offset="1" stopColor="#0c1434" />
        </linearGradient>
      </defs>

      {/* 벽: 어두운 한지 벽 + 등불이 비친 따뜻한 빛 */}
      <rect width="375" height="520" fill={`url(#${ID}-wall)`} />
      {[60, 315].map((x) => (
        <circle key={x} cx={x} cy={210} r={130} fill={`url(#${ID}-lampGlow)`} />
      ))}
      {/* 벽 기둥·인방 */}
      {[18, 357].map((x) => (
        <rect key={x} x={x - 9} y={60} width={18} height={380} fill={`url(#${ID}-wood)`} />
      ))}
      <rect x="0" y="49" width="375" height="8" fill={`url(#${ID}-wood)`} />

      {/* 만월창: 밤하늘 · 보름달 · 구름 · 먼 산 · 소나무 가지 */}
      <g clipPath={`url(#${ID}-window)`}>
        <rect x={WX - WR} y={WY - WR} width={WR * 2} height={WR * 2} fill={`url(#${ID}-night)`} />
        <StarField seed={201} n={60} x={[WX - WR, WX + WR]} y={[WY - WR, WY + 30]} size={[0.25, 1]} halo={0.08} />
        <FullMoon id={`${ID}-moon`} x={WX + 26} y={WY - 34} r={30} />
        <Nebula id={`${ID}-c1`} cx={WX - 30} cy={WY + 10} rx={90} ry={16} color="#c8d4ff" seed={203} freq={0.03} cut={0.5} density={2} opacity={0.55} className="hb-drift" style={v({ "--d": "36s" })} />
        <path d={`M${WX - WR} ${WY + 46} L${WX - 60} ${WY + 22} L${WX - 30} ${WY + 38} L${WX + 4} ${WY + 8} L${WX + 40} ${WY + 34} L${WX + 70} ${WY + 18} L${WX + WR} ${WY + 40} V${WY + WR} H${WX - WR}Z`} fill="#1c2a5c" />
        <path d={`M${WX - WR} ${WY + 62} L${WX - 40} ${WY + 46} L${WX + 10} ${WY + 60} L${WX + 60} ${WY + 44} L${WX + WR} ${WY + 58} V${WY + WR} H${WX - WR}Z`} fill="#121c44" />
        {/* 소나무 가지 (창 왼쪽 위에서 들어온다) */}
        <g fill="#0a1230" className="hb-sway" style={v({ "--d": "10s", transformOrigin: `${WX - WR}px ${WY - 40}px`, transformBox: "view-box" })}>
          <path d={`M${WX - WR - 4} ${WY - 44} Q${WX - 50} ${WY - 52} ${WX - 18} ${WY - 70}`} stroke="#0a1230" strokeWidth="4" fill="none" />
          {(
            [
              [WX - 64, WY - 56, 15],
              [WX - 34, WY - 68, 13],
              [WX - 14, WY - 74, 10],
            ] as const
          ).map(([x, y, r], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={r * 1.5} ry={r * 0.55} />
              {Array.from({ length: 7 }, (_, k) => (
                <line key={k} x1={x - r * 1.4 + (k * r * 2.8) / 6} y1={y - r * 0.3} x2={x - r * 1.3 + (k * r * 2.8) / 6} y2={y - r * 0.85} stroke="#0a1230" strokeWidth="1.1" />
              ))}
            </g>
          ))}
        </g>
      </g>
      {/* 창틀: 두꺼운 나무 테 + 아래쪽 창살 */}
      <circle cx={WX} cy={WY} r={WR + 6} fill="none" stroke={`url(#${ID}-wood)`} strokeWidth="12" />
      <circle cx={WX} cy={WY} r={WR + 12} fill="none" stroke={GOLD} strokeWidth="1" opacity=".5" />
      <g clipPath={`url(#${ID}-window)`} stroke="#5a3420" strokeWidth="2.4" opacity=".9">
        {[-60, -30, 0, 30, 60].map((dx) => (
          <line key={dx} x1={WX + dx} y1={WY + 52} x2={WX + dx} y2={WY + WR} />
        ))}
        <line x1={WX - WR} y1={WY + 52} x2={WX + WR} y2={WY + 52} />
        <line x1={WX - WR} y1={WY + 74} x2={WX + WR} y2={WY + 74} />
      </g>
      <Glint x={WX - 52} y={WY - 30} r={1.1} delay={1} />

      {/* 천장: 서까래 + 단청 띠 */}
      <path d="M0 0 H375 V30 H0Z" fill="#20120e" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = i * 25 + 6;
        return (
          <g key={i}>
            <rect x={x} y={0} width={14} height={26} rx="3" fill="#4a2c1c" />
            <circle cx={x + 7} cy={22} r="6" fill={OBANG[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2]} stroke="#2a160e" strokeWidth="1.4" />
            <circle cx={x + 7} cy={22} r="2.4" fill="#f4efe4" />
          </g>
        );
      })}
      <rect x="0" y="30" width="375" height="16" fill="#2a6a5a" />
      {Array.from({ length: 19 }, (_, i) => {
        const x = i * 20 + 10;
        return (
          <g key={i}>
            <path d={`M${x - 8} 38 L${x} 31 L${x + 8} 38 L${x} 45 Z`} fill={OBANG[i % 5 === 3 ? 3 : i % 5 === 4 ? 2 : i % 5]} opacity=".9" />
            <circle cx={x} cy={38} r="2" fill="#f4efe4" />
          </g>
        );
      })}
      <rect x="0" y="46" width="375" height="3" fill="#d83a3a" opacity=".8" />

      {/* 왼쪽: 천문도 병풍 (네 폭) */}
      <g>
        {[0, 1, 2].map((k) => {
          const x = 34 + k * 26;
          const skew = k % 2 ? 4 : -4;
          return (
            <g key={k}>
              <path d={`M${x} ${150 + skew} L${x + 26} ${150 - skew} L${x + 26} ${400 - skew} L${x} ${400 + skew} Z`} fill={`url(#${ID}-screen)`} stroke="#8a5a2a" strokeWidth="2" />
              {/* 별자리 점·선 */}
              {(() => {
                const r = rng(301 + k);
                const pts = Array.from({ length: 7 }, () => [x + 4 + r() * 18, 170 + r() * 210] as const);
                return (
                  <g>
                    <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={GOLD} strokeWidth=".6" opacity=".7" />
                    {pts.map(([px, py], i) => (
                      <circle key={i} cx={px} cy={py} r={i % 3 ? 1 : 1.6} fill={i % 2 ? "#ffe6a0" : "#ff9a8a"} className="hb-tw" style={v({ "--d": `${3 + (i % 3)}s`, animationDelay: `${i * 0.4}s` })} />
                    ))}
                  </g>
                );
              })()}
              <circle cx={x + 13} cy={168} r="7" fill="none" stroke={GOLD} strokeWidth=".7" opacity=".7" />
            </g>
          );
        })}
      </g>

      {/* 오른쪽: 책장 (서책·두루마리) + 매화 꽂은 백자 */}
      <g>
        <rect x={268} y={150} width={84} height={250} fill="#3a2014" stroke="#6a3e24" strokeWidth="3" />
        {[205, 260, 315].map((y) => (
          <rect key={y} x={268} y={y} width={84} height={5} fill="#6a3e24" />
        ))}
        {/* 서책 더미 */}
        {[
          [274, 193, 40, "#2f4a8a"],
          [276, 185, 36, "#8a2f3a"],
          [273, 177, 42, "#2f6a5a"],
          [296, 245, 44, "#3a3a7a"],
          [298, 237, 40, "#7a5a2a"],
        ].map(([x, y, w, c], i) => (
          <g key={i}>
            <rect x={Number(x)} y={Number(y)} width={Number(w)} height="8" fill={String(c)} />
            <rect x={Number(x)} y={Number(y) + 3} width={Number(w)} height="2" fill="#f4efe4" opacity=".5" />
            {[0.25, 0.5, 0.75].map((t) => (
              <line key={t} x1={Number(x) + Number(w) * t} y1={Number(y)} x2={Number(x) + Number(w) * t} y2={Number(y) + 8} stroke="#f4efe4" strokeWidth=".6" opacity=".6" />
            ))}
          </g>
        ))}
        {/* 두루마리 */}
        {[300, 318, 334].map((x, i) => (
          <g key={x}>
            <rect x={x - 6} y={286 + i * 2} width={12} height={28 - i * 2} rx="3" fill="#e8d8b8" />
            <rect x={x - 7} y={286 + i * 2} width={14} height={3} fill="#8a2f3a" />
          </g>
        ))}
        {/* 백자와 매화 */}
        <path d="M296 358 Q284 372 290 388 Q296 398 308 398 Q320 398 326 388 Q332 372 320 358 Z" fill="#eef0f2" />
        <path d="M302 358 H314 V352 H302Z" fill="#dfe3e8" />
        <path d="M308 352 Q300 330 286 322 M308 352 Q318 328 334 318 M308 352 Q306 334 312 312" stroke="#3a2a2a" strokeWidth="1.6" fill="none" />
        {[
          [288, 322],
          [296, 332],
          [332, 318],
          [322, 328],
          [312, 312],
          [306, 326],
        ].map(([x, y], i) => (
          <g key={i} className="hb-tw" style={v({ "--d": `${4 + (i % 3)}s`, animationDelay: `${i * 0.5}s` })}>
            <circle cx={x} cy={y} r="3.2" fill="#ffb8c8" />
            <circle cx={x} cy={y} r="1.1" fill="#ffe08a" />
          </g>
        ))}
      </g>

      {/* 청사초롱 둘 (흔들) */}
      {[96, 278].map((x, i) => (
        <g key={x} className="hb-sway" style={v({ "--d": `${5 + i}s`, transformOrigin: `${x}px 57px`, transformBox: "view-box" })}>
          <line x1={x} y1={57} x2={x} y2={110} stroke="#2a160e" strokeWidth="1.4" />
          <circle cx={x} cy={132} r={30} fill="#ffb86a" opacity=".2" />
          <rect x={x - 12} y={108} width={24} height={4} fill={GOLD} />
          <path d={`M${x - 14} 112 Q${x - 18} 126 ${x - 14} 140 H${x + 14} Q${x + 18} 126 ${x + 14} 112 Z`} fill="#d83a3a" />
          <path d={`M${x - 14} 132 Q${x - 17} 136 ${x - 14} 146 H${x + 14} Q${x + 17} 136 ${x + 14} 132 Z`} fill="#2f6fd0" />
          {/* 촛불 빛 덮개: 투명도는 감싼 g 에 (깜빡임 애니메이션이 opacity 를 덮어쓰므로) */}
          <g opacity=".28">
            <path d={`M${x - 14} 112 Q${x - 18} 126 ${x - 14} 146 H${x + 14} Q${x + 18} 126 ${x + 14} 112 Z`} fill="#ffe0a0" className="hb-candle" style={v({ "--d": "1.8s" })} />
          </g>
          <rect x={x - 12} y={146} width={24} height={4} fill={GOLD} />
          <path d={`M${x - 4} 150 l-1 12 M${x} 150 v14 M${x + 4} 150 l1 12`} stroke="#d83a3a" strokeWidth="1.2" />
        </g>
      ))}
      {/* 오방색 매듭 (창 양옆) */}
      {[WX - WR - 18, WX + WR + 18].map((x, i) => (
        <g key={x} className="hb-sway" style={v({ "--d": `${6 + i}s`, transformOrigin: `${x}px 112px`, transformBox: "view-box" })}>
          <line x1={x} y1={110} x2={x} y2={134} stroke={GOLD} strokeWidth="1" />
          {OBANG.slice(0, 4).map((c, k) => (
            <path key={k} d={`M${x} ${136 + k * 9}l5 4.5l-5 4.5l-5 -4.5z`} fill={c} stroke={GOLD} strokeWidth=".5" />
          ))}
          <path d={`M${x - 3} 172 l-1 18 M${x} 172 v20 M${x + 3} 172 l1 18`} stroke={OBANG[1]} strokeWidth="1.2" />
        </g>
      ))}

      {/* 마루 바닥 */}
      <path d="M0 410 H375 V520 H0Z" fill={`url(#${ID}-floor)`} />
      <rect x="0" y="404" width="375" height="8" fill="#6a3e24" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={187 + (i - 4) * 30} y1={412} x2={187 + (i - 4) * 80} y2={520} stroke="#2a160e" strokeWidth="1.2" opacity=".6" />
      ))}
      {[440, 474].map((y) => (
        <line key={y} x1="0" y1={y} x2="375" y2={y} stroke="#2a160e" strokeWidth="1" opacity=".5" />
      ))}
      <ellipse cx={WX} cy={440} rx={150} ry={22} fill="#ffcf8a" opacity=".12" />

      {/* 서안: 펼친 사주책 · 붓 · 벼루 (왼쪽 앞) */}
      <g>
        <path d="M18 432 H118 L124 442 H12 Z" fill="#6a3a1e" />
        <rect x={14} y={442} width={110} height={6} fill="#4a2814" />
        {[20, 112].map((x) => (
          <path key={x} d={`M${x} 448 v18 h6 v-18`} fill="#4a2814" />
        ))}
        {/* 펼친 책: 사주 네 기둥 */}
        <path d="M38 432 L66 428 L94 432 L94 418 L66 414 L38 418 Z" fill="#f2e6cc" stroke="#c9b48a" strokeWidth=".6" />
        <line x1="66" y1="414" x2="66" y2="428" stroke="#c9b48a" strokeWidth=".8" />
        {["年", "月", "日", "時"].map((ch, i) => (
          <text key={ch} x={44 + i * 13 + (i > 1 ? 2 : 0)} y={424} fontSize="6.5" fill="#3a2a2a" fontFamily='"Noto Serif KR", "Apple SD Gothic Neo", serif'>
            {ch}
          </text>
        ))}
        {/* 벼루와 붓 */}
        <rect x={100} y={426} width={16} height={6} rx="2" fill="#2a2430" />
        <path d="M24 428 L54 410" stroke="#8a5a2a" strokeWidth="2" strokeLinecap="round" />
        <path d="M54 410 l5 -3" stroke="#1a1418" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* 향로와 연기 (오른쪽 앞) */}
      <g>
        <ellipse cx="318" cy="448" rx="16" ry="4" fill="#3a2a1a" />
        <path d="M304 446 Q318 466 332 446 Z" fill="#a07a3a" />
        <path d="M306 446 H330" stroke={GOLD} strokeWidth="1.2" />
        <g className="hb-drift" style={v({ "--d": "8s" })} opacity=".45">
          <Baked id={`${ID}-smoke`} pad={18}>
            <g filter={`url(#${ID}-soft)`}>
              <path d="M318 442 C312 420 326 404 318 384 C310 364 324 350 318 330" stroke="#e8dccf" strokeWidth="4" fill="none" />
              <path d="M320 440 C328 422 314 410 322 392 C330 374 316 362 324 344" stroke="#f4ece0" strokeWidth="2.4" fill="none" />
            </g>
          </Baked>
        </g>
      </g>
      {/* 바닥 방석 */}
      <ellipse cx={WX} cy={470} rx={60} ry={10} fill="#8a2f3a" />
      <ellipse cx={WX} cy={467} rx={56} ry={8} fill="#b03a4a" />
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = polar(WX, 467, 46, i * 45);
        return <circle key={i} cx={x} cy={467 + (y - 467) * 0.17} r="1.4" fill={GOLD} />;
      })}
      <Fireflies seed={207} n={16} x={[20, 355]} y={[150, 400]} color="#ffd59a" size={1} />
    </Scene>
  );
}
