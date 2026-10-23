/**
 * 앱 전체 우주 배경 (어두운 보라 은하수, 2026-10-24 사용자 선택).
 * 비스듬한 은하수 띠 + 성운 + 반짝이는 별 + 가끔 떨어지는 별똥별.
 * 별 위치는 고정된 씨앗값으로 만들어 서버·브라우저에서 같은 모양이 나온다.
 * 별똥별은 SVG 자체 애니메이션(SMIL)이라 globals.css를 건드리지 않는다. 동작 줄이기 설정이면 숨긴다.
 */

/** 서버·브라우저의 계산 결과가 끝자리에서 달라 하이드레이션이 어긋나지 않게 반올림한다 */
const rd = (n: number) => Math.round(n * 100) / 100;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** 화면 좌표(375×812 기준) */
const VW = 375;
const VH = 812;
/** 은하수 띠 중심선: 왼쪽 아래 → 오른쪽 위 */
const bandY = (x: number) => VH * 0.62 - x * 0.95;

type Star = { x: number; y: number; r: number; o: number; d: number; tw: boolean };
const STARS: Star[] = (() => {
  const rand = rng(11);
  const out: Star[] = [];
  while (out.length < 320) {
    const x = rand() * VW;
    const y = rand() * VH;
    // 은하수 띠 근처에 별이 더 몰리게 한다
    const near = Math.max(0.15, 1 - Math.abs(y - bandY(x)) / 170);
    if (rand() > near) continue;
    const big = rand() < 0.06;
    out.push({ x: rd(x), y: rd(y), r: rd(big ? 1.1 + rand() * 0.9 : 0.35 + rand() * 0.6), o: rd(0.35 + rand() * 0.65), d: rd(rand() * 6), tw: rand() < 0.35 });
  }
  return out;
})();

/** 십자 빛이 나는 밝은 별 몇 개 */
const BRIGHT = [
  { x: 62, y: 118, s: 1 },
  { x: 318, y: 210, s: 0.8 },
  { x: 96, y: 520, s: 0.7 },
  { x: 290, y: 640, s: 0.9 },
];

/** 별똥별: 시작 위치·주기·시작 지연(초). 주기의 앞부분에만 지나가고 나머지는 쉰다 */
const METEORS = [
  { x: 40, y: 90, dur: 9, begin: 1.5 },
  { x: 200, y: 40, dur: 13, begin: 5 },
  { x: 120, y: 300, dur: 11, begin: 8.5 },
  { x: 260, y: 140, dur: 17, begin: 12 },
];

export function CosmicBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c0526_0%,#08041c_55%,#04020c_100%)]" />
      {/* 성운: 위쪽 보라, 오른쪽 자주, 아래 남색 */}
      <div className="absolute -left-1/4 top-[-6%] h-[48%] w-[100%] rounded-full bg-[radial-gradient(closest-side,rgba(147,51,234,0.38),rgba(88,28,135,0.12)_60%,transparent)] blur-2xl" />
      <div className="absolute right-[-30%] top-[30%] h-[40%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(219,39,119,0.2),transparent)] blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-20%] h-[45%] w-[95%] rounded-full bg-[radial-gradient(closest-side,rgba(67,56,202,0.32),transparent)] blur-3xl" />
      {/* 화면을 비스듬히 가로지르는 은하수 띠 + 가운데 어두운 먼지띠 */}
      <div className="absolute left-[-45%] top-[16%] h-[40%] w-[190%] -rotate-[42deg] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(243,232,255,0.38),rgba(196,181,253,0.24)_30%,rgba(124,58,237,0.14)_55%,transparent_75%)] blur-xl" />
      <div className="absolute left-[-45%] top-[25%] h-[13%] w-[190%] -rotate-[42deg] bg-[radial-gradient(ellipse_45%_50%_at_52%_50%,rgba(16,6,40,0.7),transparent_70%)] blur-md" />

      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="meteor-tail" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#e9d5ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bright-glow">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0" />
          </radialGradient>
        </defs>

        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={s.o}
            className={s.tw ? "animate-[twinkle_4s_ease-in-out_infinite_alternate] motion-reduce:animate-none" : undefined}
            style={s.tw ? { animationDelay: `${s.d}s` } : undefined}
          />
        ))}

        {BRIGHT.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
            <g className="animate-[twinkle_5s_ease-in-out_infinite_alternate] motion-reduce:animate-none" style={{ animationDelay: `${i * 1.3}s` }}>
              <circle r="9" fill="url(#bright-glow)" />
              <path d="M0 -11 L0.9 -0.9 L11 0 L0.9 0.9 L0 11 L-0.9 0.9 L-11 0 L-0.9 -0.9 Z" fill="#fff" opacity="0.9" />
            </g>
          </g>
        ))}

        {/* 별똥별 */}
        <g className="motion-reduce:hidden">
          {METEORS.map((m, i) => {
            const end = `${m.x + 190} ${m.y + 120}`;
            return (
              <g key={i} opacity="0">
                <animateTransform attributeName="transform" type="translate" values={`${m.x} ${m.y};${end};${end}`} keyTimes="0;0.09;1" dur={`${m.dur}s`} begin={`${m.begin}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.01;0.06;0.09;1" dur={`${m.dur}s`} begin={`${m.begin}s`} repeatCount="indefinite" />
                <line x1="0" y1="0" x2="-70" y2="-44" stroke="url(#meteor-tail)" strokeWidth="1.6" strokeLinecap="round" />
                <circle r="1.6" fill="#fff" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
