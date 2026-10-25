/**
 * 별자리 배경: 산꼭대기 별빛 천문대 (2026-10-25 사용자 결정).
 * 짙은 밤하늘의 은하수·성운 · 천천히 도는 황도 12궁 고리(별자리 점·선) · 초승달 · 별똥별 ·
 * 오른쪽 돔이 열린 천문대(큰 망원경과 하늘로 뻗는 빛) · 왼쪽 벼랑 끝 황동 망원경 ·
 * 산 아래 달빛 받은 구름바다(운해) · 바위 정상과 등불.
 * 좌표계·움직임 규칙은 ./common (장면 375×520, 아래 기준으로 잘라 맞춤).
 */
import { Fireflies, Glint, Glow, Mist, Nebula, Scene, ShootingStar, StarField, cos, polar, rng, sin, v } from "./common";
import { CrescentMoon } from "./art";

const ID = "ob";
const GOLD = "#f4d38a";
const CX = 187;
const CY = 214;

/** 황도 12궁 별자리 모양 (간단히): 고리 둘레 12곳에 3~5개 별을 잇는다 */
function zodiacMarks() {
  const r = rng(1212);
  return Array.from({ length: 12 }, (_, i) => {
    const [ax, ay] = polar(CX, CY, 140, i * 30 + 15);
    const n = 3 + Math.floor(r() * 3);
    const pts: Array<[number, number]> = [[ax, ay]];
    for (let k = 1; k < n; k++) {
      const a = r() * Math.PI * 2;
      pts.push([pts[k - 1][0] + cos(a) * (6 + r() * 6), pts[k - 1][1] + sin(a) * (6 + r() * 6)]);
    }
    return pts;
  });
}

export function ObservatoryBackdrop() {
  const marks = zodiacMarks();
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030622" />
          <stop offset=".45" stopColor="#0c1748" />
          <stop offset=".75" stopColor="#1e2c6a" />
          <stop offset="1" stopColor="#3a3a7e" />
        </linearGradient>
        <linearGradient id={`${ID}-dome`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a6a9a" />
          <stop offset=".4" stopColor="#c8d2ec" />
          <stop offset=".7" stopColor="#8a98c0" />
          <stop offset="1" stopColor="#3a4672" />
        </linearGradient>
        <linearGradient id={`${ID}-wall`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a2f5a" />
          <stop offset=".5" stopColor="#4a5284" />
          <stop offset="1" stopColor="#22264a" />
        </linearGradient>
        <linearGradient id={`${ID}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#cfe0ff" stopOpacity=".5" />
          <stop offset="1" stopColor="#cfe0ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${ID}-rock`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2a5a" />
          <stop offset="1" stopColor="#100e2c" />
        </linearGradient>
        <linearGradient id={`${ID}-cloudSea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8d4ff" stopOpacity=".85" />
          <stop offset="1" stopColor="#6a78b8" stopOpacity=".6" />
        </linearGradient>
      </defs>

      {/* 하늘 · 은하수 · 성운 */}
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-mw1`} cx={200} cy={180} rx={320} ry={70} rotate={-38} color="#c9b6ff" seed={401} freq={0.014} cut={0.5} opacity={0.7} />
      <Nebula id={`${ID}-mw2`} cx={190} cy={190} rx={260} ry={26} rotate={-38} color="#0a0a30" seed={403} freq={0.03} cut={0.5} density={2.4} blend="normal" opacity={0.6} />
      <Nebula id={`${ID}-n1`} cx={60} cy={90} rx={140} ry={100} color="#5ad8ff" seed={405} freq={0.012} cut={0.6} opacity={0.4} />
      <Nebula id={`${ID}-n2`} cx={320} cy={280} rx={140} ry={100} color="#ff7ad0" seed={407} freq={0.012} cut={0.62} opacity={0.35} />
      <StarField seed={409} n={280} y={[0, 380]} size={[0.2, 1.1]} halo={0.06} />
      <StarField seed={410} n={320} size={[0.18, 0.75]} band={{ x1: -40, y1: 380, x2: 420, y2: 0, w: 30 }} halo={0.02} />
      <CrescentMoon id={`${ID}-moon`} x={60} y={70} r={15} />
      <Glint x={300} y={54} r={1.5} />
      <Glint x={120} y={300} r={1.1} delay={1.8} color="#cfe4ff" />
      <ShootingStar id={`${ID}-s1`} x={120} y={30} delay={1.5} />
      <ShootingStar id={`${ID}-s2`} x={20} y={200} dx={150} dy={60} delay={6} d={12} />

      {/* 황도 12궁 고리 (천천히 돈다) */}
      <g className="hb-spin" style={v({ "--d": "360s", transformOrigin: `${CX}px ${CY}px` })} opacity=".85">
        <Glow id={`${ID}-zodiac`}>
          <circle cx={CX} cy={CY} r={156} fill="none" stroke={GOLD} strokeWidth="1.2" opacity=".6" />
          <circle cx={CX} cy={CY} r={124} fill="none" stroke={GOLD} strokeWidth=".7" opacity=".45" strokeDasharray="2 5" />
          {Array.from({ length: 12 }, (_, i) => {
            const [x1, y1] = polar(CX, CY, 124, i * 30);
            const [x2, y2] = polar(CX, CY, 156, i * 30);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth=".7" opacity=".5" />;
          })}
        </Glow>
        {marks.map((pts, i) => (
          <g key={i}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#cfe0ff" strokeWidth=".6" opacity=".75" />
            {pts.map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={k ? 1.1 : 1.7} fill="#fff" className="hb-tw" style={v({ "--d": `${3 + (k % 3)}s`, animationDelay: `${(i + k) % 5}s` })} />
            ))}
          </g>
        ))}
      </g>

      {/* 구름바다 (산 아래, 천천히 흐름) */}
      <g className="hb-drift" style={v({ "--d": "48s" })}>
        <Nebula id={`${ID}-sea1`} cx={190} cy={372} rx={260} ry={30} color="#d8e0ff" seed={411} freq={0.02} cut={0.45} density={2} opacity={0.7} />
      </g>
      <path d="M0 368 Q40 356 80 364 T160 360 T240 366 T320 358 T375 364 V392 H0Z" fill={`url(#${ID}-cloudSea)`} opacity=".7" />
      {/* 먼 봉우리들이 구름 위로 */}
      <path d="M0 372 L22 350 L40 362 L64 340 L92 364 Z" fill="#26305e" />
      <path d="M250 368 L276 346 L300 360 L322 336 L352 360 L375 350 V372 Z" fill="#26305e" />
      <Mist id={ID} y={384} color="#c8d4ff" opacity={0.4} d={40} />

      {/* 오른쪽 천문대: 원통 몸 + 반구 돔(열린 틈) + 망원경 + 빛 */}
      <g>
        <path d="M254 262 L318 168" stroke={`url(#${ID}-beam)`} strokeWidth="26" strokeLinecap="round" opacity=".35" />
        <path d="M248 266 L300 200" stroke="#cfe0ff" strokeWidth="3" opacity=".25" />
        <rect x={236} y={300} width={110} height={120} fill={`url(#${ID}-wall)`} />
        {[250, 278, 306, 334].map((x) => (
          <line key={x} x1={x} y1={302} x2={x} y2={418} stroke="#1a1e40" strokeWidth="1.2" opacity=".6" />
        ))}
        <path d={`M232 302 A59 59 0 0 1 350 302 Z`} fill={`url(#${ID}-dome)`} />
        {/* 돔의 열린 틈과 안쪽 빛 */}
        <path d="M282 248 L298 246 L304 302 L276 302 Z" fill="#141838" />
        <g opacity=".24">
          <path d="M282 248 L298 246 L304 302 L276 302 Z" fill="#ffd98a" className="hb-candle" style={v({ "--d": "2.4s" })} />
        </g>
        {/* 망원경 (틈에서 하늘로) */}
        <g transform="rotate(-36 290 286)">
          <rect x={282} y={232} width={16} height={58} rx="3" fill="#2a2f5a" stroke={GOLD} strokeWidth="1" />
          <rect x={279} y={228} width={22} height={10} rx="2" fill={GOLD} />
        </g>
        <path d="M232 302 H350" stroke={GOLD} strokeWidth="1.2" opacity=".7" />
        {/* 창과 문 */}
        {[256, 322].map((x) => (
          <g key={x}>
            <rect x={x - 7} y={322} width={14} height={18} rx="7" fill="#ffd98a" opacity=".9" className="hb-pulse" style={v({ "--d": "5s" })} />
            <circle cx={x} cy={331} r={16} fill="#ffd98a" opacity=".14" />
          </g>
        ))}
        <path d="M282 420 V378 Q291 368 300 378 V420 Z" fill="#141838" />
        <circle cx={296} cy={400} r="1.6" fill={GOLD} />
        {/* 난간 */}
        <path d="M228 298 H354" stroke="#8a98c0" strokeWidth="1.6" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={232 + i * 15} y1={298} x2={232 + i * 15} y2={292} stroke="#8a98c0" strokeWidth="1.2" />
        ))}
      </g>

      {/* 바위 정상 (마스코트가 서는 곳) */}
      <path d="M0 420 Q40 400 90 408 Q140 396 190 404 Q250 396 300 406 Q340 400 375 410 V520 H0Z" fill={`url(#${ID}-rock)`} />
      <path d="M0 420 Q40 400 90 408 Q140 396 190 404 Q250 396 300 406 Q340 400 375 410" stroke="#8a98d8" strokeWidth="1.3" fill="none" opacity=".6" />
      {[
        [40, 432, 16, 6],
        [120, 446, 10, 4],
        [260, 440, 14, 5],
        [340, 452, 12, 4],
      ].map(([x, y, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#1e1c48" />
          <ellipse cx={x - 2} cy={y - 1.5} rx={rx * 0.7} ry={ry * 0.5} fill="#3a3a74" />
        </g>
      ))}

      {/* 왼쪽 벼랑 끝 작은 천구의 (받침 위에서 고리가 천천히 돈다) */}
      <g>
        <path d="M44 414 H76 L70 404 H50 Z" fill="#c8a060" />
        <rect x={58} y={378} width={4} height={28} fill="#c8a060" />
        <circle cx={60} cy={364} r={17} fill="#1c2a5c" stroke={GOLD} strokeWidth="1.4" />
        <g className="hb-spin" style={v({ "--d": "30s", transformOrigin: "60px 364px" })}>
          <ellipse cx={60} cy={364} rx={17} ry={6} fill="none" stroke={GOLD} strokeWidth="1.1" transform="rotate(-23 60 364)" />
          <ellipse cx={60} cy={364} rx={6} ry={17} fill="none" stroke={GOLD} strokeWidth=".8" opacity=".8" />
        </g>
        {[
          [54, 358],
          [66, 368],
          [61, 352],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill="#fff" />
        ))}
        <circle cx={60} cy={364} r={24} fill="#9ad8ff" opacity=".1" />
      </g>

      {/* 등불 (바위 위) */}
      {[150, 228].map((x, i) => (
        <g key={x}>
          <rect x={x - 1.5} y={390} width={3} height={20} fill="#1a1838" />
          <circle cx={x} cy={388} r="14" fill="#ffd98a" opacity=".18" />
          <rect x={x - 5} y={381} width={10} height={12} rx="3" fill="#ffd98a" className="hb-candle" style={v({ "--d": `${1.6 + i * 0.4}s` })} />
        </g>
      ))}
      <Fireflies seed={413} n={18} x={[0, 375]} y={[300, 470]} color="#cfe4ff" size={1} />
    </Scene>
  );
}
