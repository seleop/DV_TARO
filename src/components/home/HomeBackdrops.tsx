/**
 * 홈 밤하늘 배경 시안 (2026-10-25 사용자 요청: 오늘의 운세 로딩 배경 같은 디자인, 토픽 = 우주·점술·운세·타로).
 * SVG 일러스트 3개(가벼움) + three.js 3개(HomeThreeBackdrop). 사용자가 고르면 하나만 남기고 정리한다.
 *
 * SVG 시안은 장면 영역을 꽉 채우고(아래 기준으로 잘라 맞춤) 별이가 서는 땅은 아래쪽 띠다.
 * 움직임은 별 반짝임·느린 떠다님·느린 회전뿐이고, '동작 줄이기' 설정이면 멈춘다.
 */
import type { ReactNode } from "react";
import { HomeThreeBackdrop } from "./three/HomeThreeBackdrop";

export type HomeBackdropId = "1" | "2" | "3" | "4" | "5" | "6";

export const HOME_BACKDROPS: Record<HomeBackdropId, { name: string; desc: string; render: () => ReactNode }> = {
  "1": { name: "별자리 천구", desc: "SVG · 천천히 도는 황도 12궁 고리, 별자리 선, 초승달", render: () => <ZodiacSky /> },
  "2": { name: "타로의 밤", desc: "SVG · 보랏빛 성운에 떠 있는 해·달·별 타로 카드", render: () => <TarotNight /> },
  "3": { name: "달의 위상", desc: "SVG · 하늘 아치를 따라 차오르는 달, 달빛 비친 호수", render: () => <MoonPhases /> },
  "4": { name: "은하 소용돌이", desc: "3D · 천천히 도는 나선 은하 입자", render: () => <HomeThreeBackdrop variant="galaxy" /> },
  "5": { name: "떠다니는 타로", desc: "3D · 우주에 떠서 천천히 도는 타로 카드들", render: () => <HomeThreeBackdrop variant="cards" /> },
  "6": { name: "천구의", desc: "3D · 금빛 고리가 겹쳐 도는 천구의와 빛나는 구슬", render: () => <HomeThreeBackdrop variant="orrery" /> },
};

export function isHomeBackdropId(v: unknown): v is HomeBackdropId {
  return typeof v === "string" && v in HOME_BACKDROPS;
}

/** 고정된 배치(씨앗 난수)의 별 */
function seededStars(seed: number, n: number, w: number, h: number) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: n }, () => ({ x: rand() * w, y: rand() * h, r: 0.4 + rand() * 1.1, d: rand() * 3.5, o: 0.45 + rand() * 0.5 }));
}

function Stars({ seed, n, h = 400 }: { seed: number; n: number; h?: number }) {
  return (
    <>
      {seededStars(seed, n, 375, h).map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" opacity={st.o} className="hb-tw" style={{ animationDelay: `${st.d}s` }} />
      ))}
    </>
  );
}

/** 십자 빛 큰 별 */
function Sparkle({ x, y, r, delay = 0, color = "#fff" }: { x: number; y: number; r: number; delay?: number; color?: string }) {
  return (
    <g className="hb-tw" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x} ${y - r * 4}Q${x} ${y} ${x + r * 4} ${y}Q${x} ${y} ${x} ${y + r * 4}Q${x} ${y} ${x - r * 4} ${y}Q${x} ${y} ${x} ${y - r * 4}Z`} fill={color} opacity=".9" />
      <circle cx={x} cy={y} r={r * 1.6} fill={color} opacity=".25" />
    </g>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 375 520" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
      {children}
      <style>{`
        @keyframes hb-tw { 50% { opacity: .3 } }
        @keyframes hb-float { 50% { transform: translateY(-7px) } }
        @keyframes hb-spin { to { transform: rotate(360deg) } }
        @keyframes hb-shoot {
          0% { transform: translate(0, 0); opacity: 0 }
          4% { opacity: 1 }
          16% { transform: translate(190px, 80px); opacity: 0 }
          100% { transform: translate(190px, 80px); opacity: 0 }
        }
        .hb-tw { animation: hb-tw 3.4s ease-in-out infinite; }
        .hb-float { animation: hb-float 5s ease-in-out infinite; transform-box: fill-box; }
        .hb-spin { animation: hb-spin 160s linear infinite; transform-box: view-box; }
        .hb-shoot { animation: hb-shoot 8s ease-out 1.5s infinite; opacity: 0; }
        @media (prefers-reduced-motion: reduce) { .hb-tw, .hb-float, .hb-spin, .hb-shoot { animation: none; } .hb-shoot { display: none; } }
      `}</style>
    </svg>
  );
}

function ShootingStar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hb-shoot">
        <path d="M0 0 L-52 -22" stroke="url(#hb-tail)" strokeWidth="1.6" strokeLinecap="round" />
        <circle r="1.9" fill="#fff" />
      </g>
      <defs>
        <linearGradient id="hb-tail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  );
}

/* ───────────── 1. 별자리 천구 ───────────── */

const CONSTELLATIONS: Array<Array<[number, number]>> = [
  // 왼쪽 위: 큰곰자리 국자
  [
    [28, 70],
    [58, 58],
    [86, 66],
    [108, 88],
    [140, 84],
    [146, 112],
    [112, 118],
  ],
  // 오른쪽: 카시오페이아 W
  [
    [250, 150],
    [272, 128],
    [292, 150],
    [314, 126],
    [340, 142],
  ],
];

function ZodiacSky() {
  const cx = 187;
  const cy = 262;
  return (
    <Svg>
      <defs>
        <linearGradient id="z1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#090b2e" />
          <stop offset=".45" stopColor="#1c1858" />
          <stop offset=".75" stopColor="#3b2a7c" />
          <stop offset="1" stopColor="#6a3f8e" />
        </linearGradient>
        <radialGradient id="z1-glow">
          <stop offset="0" stopColor="#b59cff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#7c5cff" stopOpacity=".1" />
          <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="z1-milky">
          <stop offset="0" stopColor="#d9c8ff" stopOpacity=".28" />
          <stop offset="1" stopColor="#7c5cc9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="375" height="520" fill="url(#z1-sky)" />
      <ellipse cx="180" cy="170" rx="280" ry="50" fill="url(#z1-milky)" transform="rotate(-24 180 170)" />
      <Stars seed={11} n={70} h={430} />
      {/* 별이 뒤의 은은한 빛 */}
      <circle cx={cx} cy={cy} r="170" fill="url(#z1-glow)" />
      {/* 황도 12궁 고리 (아주 천천히 돈다) */}
      <g className="hb-spin" style={{ transformOrigin: `${cx}px ${cy}px` }} fill="none" stroke="#e9c97a">
        <circle cx={cx} cy={cy} r="150" strokeWidth="1.2" opacity=".55" />
        <circle cx={cx} cy={cy} r="132" strokeWidth=".8" opacity=".4" />
        <circle cx={cx} cy={cy} r="92" strokeWidth=".7" opacity=".25" strokeDasharray="2 5" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const r1 = i % 6 === 0 ? 132 : 144;
          return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * 150} y2={cy + Math.sin(a) * 150} strokeWidth=".7" opacity=".5" />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i + 0.5) / 12) * Math.PI * 2;
          return <circle key={i} cx={cx + Math.cos(a) * 141} cy={cy + Math.sin(a) * 141} r="2.2" fill="#ffe7a8" stroke="none" opacity=".85" />;
        })}
      </g>
      {/* 별자리 선 */}
      {CONSTELLATIONS.map((pts, i) => (
        <g key={i}>
          <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#cdbdff" strokeWidth=".8" opacity=".55" />
          {pts.map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={k % 2 ? 1.6 : 2.1} fill="#fff" className="hb-tw" style={{ animationDelay: `${k * 0.5}s` }} />
          ))}
        </g>
      ))}
      {/* 초승달 */}
      <circle cx="320" cy="150" r="30" fill="#fff4d6" opacity=".1" />
      <circle cx="320" cy="150" r="16" fill="#fff1c9" />
      <circle cx="327" cy="144" r="14.5" fill="#1a1752" />
      <Sparkle x={64} y={196} r={1.4} delay={0.6} />
      <Sparkle x={330} y={232} r={1.2} delay={1.8} color="#ffe7a8" />
      <ShootingStar x={40} y={30} />
      {/* 땅: 먼 언덕 → 가까운 언덕 (빛 테두리) */}
      <path d="M0 430 Q70 398 150 416 T300 410 T375 418 V520 H0Z" fill="#2a1d5e" />
      <path d="M0 452 Q90 428 190 446 T375 440 V520 H0Z" fill="#1a1442" />
      <path d="M0 452 Q90 428 190 446 T375 440" fill="none" stroke="#7b63d6" strokeWidth="1.2" opacity=".6" />
      {[60, 300].map((x, i) => (
        <path key={i} d={`M${x} 452 l3 -12 l3 12 M${x + 7} 450 l2 -8 l2 8`} stroke="#4c3a9a" strokeWidth="1.4" fill="none" />
      ))}
    </Svg>
  );
}

/* ───────────── 2. 타로의 밤 ───────────── */

function TarotCard({ x, y, w, h, rot, delay, symbol }: { x: number; y: number; w: number; h: number; rot: number; delay: number; symbol: "sun" | "moon" | "star" }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <g className="hb-float" style={{ animationDelay: `${delay}s` }}>
        <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="12" fill="#f3c86d" opacity=".12" />
        <rect x={x} y={y} width={w} height={h} rx="8" fill="#2b1a5c" stroke="#f0c674" strokeWidth="1.6" />
        <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx="5" fill="none" stroke="#f0c674" strokeWidth=".7" opacity=".7" />
        {symbol === "sun" && (
          <g stroke="#ffd98a" strokeWidth="1.4">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <line key={i} x1={cx + Math.cos(a) * 11} y1={cy + Math.sin(a) * 11} x2={cx + Math.cos(a) * 17} y2={cy + Math.sin(a) * 17} />;
            })}
            <circle cx={cx} cy={cy} r="8" fill="#ffd98a" stroke="none" />
          </g>
        )}
        {symbol === "moon" && (
          <g>
            <circle cx={cx} cy={cy} r="13" fill="#fff1c9" />
            <circle cx={cx + 6} cy={cy - 4} r="11.5" fill="#2b1a5c" />
          </g>
        )}
        {symbol === "star" && (
          <path
            d={`M${cx} ${cy - 16}L${cx + 4} ${cy - 4}L${cx + 16} ${cy}L${cx + 4} ${cy + 4}L${cx} ${cy + 16}L${cx - 4} ${cy + 4}L${cx - 16} ${cy}L${cx - 4} ${cy - 4}Z`}
            fill="#ffe7a8"
          />
        )}
        <circle cx={cx} cy={y + 12} r="1.4" fill="#f0c674" />
        <circle cx={cx} cy={y + h - 12} r="1.4" fill="#f0c674" />
      </g>
    </g>
  );
}

function TarotNight() {
  return (
    <Svg>
      <defs>
        <linearGradient id="t2-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12082f" />
          <stop offset=".5" stopColor="#30175f" />
          <stop offset=".85" stopColor="#5d2a7e" />
          <stop offset="1" stopColor="#8a4290" />
        </linearGradient>
        <radialGradient id="t2-neb-a">
          <stop offset="0" stopColor="#ff7ac8" stopOpacity=".32" />
          <stop offset="1" stopColor="#ff7ac8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="t2-neb-b">
          <stop offset="0" stopColor="#7aa8ff" stopOpacity=".26" />
          <stop offset="1" stopColor="#7aa8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="t2-floor">
          <stop offset="0" stopColor="#f0c674" stopOpacity=".35" />
          <stop offset="1" stopColor="#f0c674" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="375" height="520" fill="url(#t2-sky)" />
      <ellipse cx="90" cy="150" rx="170" ry="110" fill="url(#t2-neb-a)" />
      <ellipse cx="300" cy="260" rx="160" ry="120" fill="url(#t2-neb-b)" />
      <Stars seed={23} n={60} h={440} />
      {/* 반짝이 가루 */}
      {seededStars(77, 26, 375, 380).map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y + 40} r={d.r * 0.9} fill="#ffe7a8" opacity={d.o * 0.8} className="hb-tw" style={{ animationDelay: `${d.d}s` }} />
      ))}
      <TarotCard x={34} y={178} w={62} h={100} rot={-14} delay={0} symbol="moon" />
      <TarotCard x={158} y={136} w={58} h={94} rot={0} delay={1.6} symbol="sun" />
      <TarotCard x={280} y={182} w={62} h={100} rot={13} delay={0.8} symbol="star" />
      <Sparkle x={130} y={210} r={1.3} delay={0.4} color="#ffe7a8" />
      <Sparkle x={250} y={70} r={1.1} delay={2.1} />
      {/* 무대 바닥: 금빛 원이 비치는 보랏빛 바닥 */}
      <path d="M0 440 Q187 410 375 440 V520 H0Z" fill="#2a1450" />
      <ellipse cx="187" cy="470" rx="150" ry="26" fill="url(#t2-floor)" />
      <ellipse cx="187" cy="470" rx="118" ry="17" fill="none" stroke="#f0c674" strokeWidth="1" opacity=".55" />
      <ellipse cx="187" cy="470" rx="90" ry="12" fill="none" stroke="#f0c674" strokeWidth=".7" opacity=".35" strokeDasharray="3 4" />
      <path d="M0 440 Q187 410 375 440" fill="none" stroke="#b77ad8" strokeWidth="1.2" opacity=".6" />
    </Svg>
  );
}

/* ───────────── 3. 달의 위상 ───────────── */

function MoonPhases() {
  // 아치를 따라 놓인 달: 초승 → 반달 → 보름(가운데) → 반달 → 그믐 (그림자 원을 옆으로 밀어 위상 표현)
  const phases = [-0.72, -0.45, -0.2, 0, 0.2, 0.45, 0.72];
  return (
    <Svg>
      <defs>
        <linearGradient id="m3-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b2a" />
          <stop offset=".5" stopColor="#152259" />
          <stop offset=".82" stopColor="#2c3c7c" />
          <stop offset="1" stopColor="#4a5c98" />
        </linearGradient>
        <radialGradient id="m3-full">
          <stop offset="0" stopColor="#fff6d8" stopOpacity=".55" />
          <stop offset=".5" stopColor="#fff6d8" stopOpacity=".12" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m3-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24346e" />
          <stop offset="1" stopColor="#0e1640" />
        </linearGradient>
        <linearGradient id="m3-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c9" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="375" height="520" fill="url(#m3-sky)" />
      <Stars seed={37} n={80} h={400} />
      {/* 아치 길 */}
      <path d="M40 300 Q187 20 335 300" fill="none" stroke="#cdd8ff" strokeWidth=".7" opacity=".3" strokeDasharray="2 6" />
      {phases.map((p, i) => {
        const t = i / (phases.length - 1);
        // 2차 베지어(40,300)-(187,20)-(335,300) 위의 점
        const x = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 187 + t * t * 335;
        const y = (1 - t) * (1 - t) * 300 + 2 * (1 - t) * t * 20 + t * t * 300;
        const full = p === 0;
        const r = full ? 24 : 10;
        return (
          <g key={i}>
            {full && <circle cx={x} cy={y} r="70" fill="url(#m3-full)" />}
            <circle cx={x} cy={y} r={r} fill="#fff1c9" />
            {full ? (
              <>
                <circle cx={x - 7} cy={y - 5} r="4" fill="#e9dcb4" opacity=".6" />
                <circle cx={x + 8} cy={y + 6} r="5.5" fill="#e9dcb4" opacity=".5" />
                <circle cx={x + 3} cy={y - 10} r="2.5" fill="#e9dcb4" opacity=".5" />
              </>
            ) : (
              <circle cx={x + p * r * 2.4} cy={y} r={r * 1.02} fill="#121c4c" />
            )}
          </g>
        );
      })}
      <Sparkle x={70} y={340} r={1.3} delay={0.5} />
      <Sparkle x={312} y={330} r={1.1} delay={1.9} color="#fff1c9" />
      <ShootingStar x={260} y={180} />
      {/* 먼 산 */}
      <path d="M0 418 L40 396 L80 408 L130 382 L180 404 L230 386 L280 406 L330 390 L375 404 V430 H0Z" fill="#1d2a62" />
      {/* 호수: 달빛 기둥과 물결 */}
      <rect x="0" y="420" width="375" height="100" fill="url(#m3-water)" />
      <rect x="160" y="420" width="54" height="80" fill="url(#m3-beam)" opacity=".5" />
      {[432, 446, 462, 480].map((y, i) => (
        <path key={i} d={`M${150 - i * 8} ${y} h${74 + i * 16}`} stroke="#fff1c9" strokeWidth="1.2" opacity={0.55 - i * 0.1} strokeLinecap="round" className="hb-tw" style={{ animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* 가까운 물가 */}
      <path d="M0 488 Q90 474 187 482 T375 480 V520 H0Z" fill="#0b1236" />
      {[28, 48, 320, 346].map((x, i) => (
        <path key={i} d={`M${x} 486 q2 -16 4 -24 M${x + 5} 486 q1 -10 3 -16`} stroke="#2c3c7c" strokeWidth="1.6" fill="none" />
      ))}
    </Svg>
  );
}
