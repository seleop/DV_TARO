"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * 오늘의 운세 장면: 별빛 오솔길 (2026-10-24 사용자 결정: 배경 시안 A).
 * 해 질 녘에서 밤으로 넘어가는 하늘 · 초승달 · 반짝이는 별 · 먼 산등성이 · 언덕 · 빛나는 징검돌 길 · 반딧불.
 * 가입의 우주 연출과 자연스럽게 이어지도록 어두운 남보라 하늘에 따뜻한 지평선 빛을 둔다.
 *
 * walking=true(운세 보는 중)면 별이 걸음에 맞춰 배경이 오른쪽에서 왼쪽으로 흐른다(별이는 오른쪽을 보고 걷는다).
 * 층마다 속도가 달라(가까운 길은 빠르게, 먼 별은 느리게) 깊이가 생기고, 걷기 시작·멈춤은 부드럽게 빨라지고 느려진다.
 * 움직임은 각 층의 transform만 바꾼다(레이아웃 다시 계산 없음). '동작 줄이기' 설정이면 움직이지 않는다.
 * 장면 영역을 꽉 채우고, 별이가 서는 자리는 아래쪽(땅 띠 위)이다.
 */

/** 걸을 때 각 층이 흐르는 빠르기(px/초): 먼 별 → 먼 산 → 언덕 → 반딧불 → 길 */
const SPEEDS = [5, 12, 26, 52, 70];

export function StarlitPath({ walking, className = "" }: { walking: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const strips = useRef<Array<HTMLDivElement | null>>([]);
  const motion = useRef({ v: 0, pos: SPEEDS.map(() => 0), width: 0, raf: 0, last: 0 });
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

  // 한 장(타일) 너비 = 장면 너비. 크기가 바뀌면 다시 잰다
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const m = motion.current;
    m.width = el.clientWidth;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      m.width = e.contentRect.width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 걷는 동안(그리고 멈추며 느려지는 동안)만 매 프레임 층을 옮긴다
  useEffect(() => {
    const m = motion.current;
    if (reduced) return;
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - (m.last || now)) / 1000);
      m.last = now;
      // 걷기 시작·멈춤: 속도가 지수적으로 목표에 다가간다 (약 0.5초)
      m.v += ((walking ? 1 : 0) - m.v) * (1 - Math.exp(-4 * dt));
      const w = m.width || 1;
      strips.current.forEach((s, i) => {
        if (!s) return;
        m.pos[i] = (m.pos[i] + SPEEDS[i] * m.v * dt) % w;
        s.style.transform = `translate3d(${-m.pos[i]}px,0,0)`;
      });
      if (walking || m.v > 0.002) m.raf = requestAnimationFrame(step);
      else m.raf = 0;
    };
    if (walking || m.v > 0.002) {
      m.last = 0;
      m.raf = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(m.raf);
      m.raf = 0;
    };
  }, [walking, reduced]);

  const strip = (i: number, cls: string, tile: React.ReactNode, aspect = "none") => (
    <div
      ref={(el) => {
        strips.current[i] = el;
      }}
      className={`absolute left-0 flex w-[200%] will-change-transform ${cls}`}
    >
      {[0, 1].map((k) => (
        <svg key={k} viewBox={TILE_VIEW[i]} preserveAspectRatio={aspect} className="h-full w-1/2 shrink-0">
          {tile}
        </svg>
      ))}
    </div>
  );

  return (
    <div ref={root} aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      {/* 하늘: 밤(위) → 보랏빛 → 따뜻한 지평선(아래) */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#141244_0%,#2b2068_34%,#5b3a8c_58%,#b0679a_78%,#f0a68b_92%,#f6c39b_100%)]" />
      {/* 은하수 띠·초승달·큰 별·가끔 지나가는 별똥별 (멀어서 걸어도 움직이지 않음) */}
      <svg viewBox="0 0 375 300" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[60%] w-full">
        <defs>
          <radialGradient id="sp-milky">
            <stop offset="0" stopColor="#d9c8ff" stopOpacity=".32" />
            <stop offset=".5" stopColor="#b48cff" stopOpacity=".14" />
            <stop offset="1" stopColor="#7c5cc9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="170" cy="150" rx="260" ry="46" fill="url(#sp-milky)" transform="rotate(-20 170 150)" />
        <ellipse cx="150" cy="160" rx="150" ry="18" fill="url(#sp-milky)" transform="rotate(-20 150 160)" />
        <circle cx="318" cy="104" r="26" fill="#fff4d6" opacity=".12" />
        <circle cx="318" cy="104" r="14" fill="#fff4d6" />
        <circle cx="324" cy="99" r="12.6" fill="#2a1f68" />
        <g className="sp-shoot">
          <path d="M0 0 L-46 -16" stroke="url(#sp-tail)" strokeWidth="1.6" strokeLinecap="round" />
          <circle r="1.8" fill="#fff" />
        </g>
        <defs>
          <linearGradient id="sp-tail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {BRIGHT.map(([x, y, r], i) => (
          <g key={i} className="sp-tw" style={{ animationDelay: `${i * 0.7}s` }}>
            <path d={`M${x - r * 3} ${y}H${x + r * 3}M${x} ${y - r * 3}V${y + r * 3}`} stroke="#fff" strokeWidth=".6" opacity=".7" />
            <circle cx={x} cy={y} r={r} fill="#fff" />
          </g>
        ))}
      </svg>
      {/* 먼 별 */}
      {strip(0, "top-0 h-[62%]", <StarTile />)}
      {/* 먼 산등성이 */}
      {strip(
        1,
        "bottom-[17%] h-[30%]",
        <path d="M0 120 V70 L40 52 L78 66 L120 34 L162 60 L205 40 L250 64 L292 30 L338 58 L372 46 L400 70 V120Z" fill="#4a2f80" opacity=".85" />,
      )}
      {/* 언덕과 작은 나무 */}
      {strip(
        2,
        "bottom-[10%] h-[24%]",
        <>
          <path d="M0 100 V58 Q60 26 125 50 T250 46 T400 58 V100Z" fill="#33215f" />
          {[48, 176, 300, 362].map((x, i) => (
            <g key={i} fill="#251850">
              <rect x={x - 1.5} y={i % 2 ? 38 : 34} width="3" height="16" />
              <circle cx={x} cy={i % 2 ? 34 : 29} r={i % 2 ? 9 : 11} />
            </g>
          ))}
          {[110, 232].map((x, i) => (
            <circle key={i} cx={x} cy={i ? 44 : 49} r="1.8" fill="#ffd98a" opacity=".9" />
          ))}
        </>,
      )}
      {/* 반딧불 (길보다 조금 느리게) */}
      {strip(
        3,
        "bottom-[12%] h-[16%]",
        <>
          {FIREFLIES.map(([x, y], i) => (
            <g key={i} className="sp-ff" style={{ animationDelay: `${(i * 0.9) % 3}s` }}>
              <circle cx={x} cy={y} r="6" fill="#fff3a8" opacity=".18" />
              <circle cx={x} cy={y} r="1.6" fill="#fff3a8" />
            </g>
          ))}
        </>,
      )}
      {/* 빛나는 징검돌 길 (별이가 걷는 땅) */}
      {strip(
        4,
        "bottom-0 h-[18%]",
        <>
          <path d="M0 100 V26 Q100 18 200 24 T400 26 V100Z" fill="#221a4c" />
          <path d="M0 26 Q100 18 200 24 T400 26" stroke="#5b4aa8" strokeWidth="1.2" fill="none" opacity=".7" />
          {[30, 130, 230, 330].map((x, i) => (
            <g key={i}>
              <ellipse cx={x} cy={i % 2 ? 50 : 54} rx="30" ry="10" fill="#ffd98a" opacity=".16" />
              <ellipse cx={x} cy={i % 2 ? 50 : 54} rx="19" ry="5" fill="#ffd98a" opacity=".85" />
            </g>
          ))}
          {[80, 182, 280, 382].map((x, i) => (
            <path key={i} d={`M${x} 30 l3 -10 l3 10 M${x + 5} 30 l2 -7 l2 7`} stroke="#6b55b8" strokeWidth="1.4" fill="none" />
          ))}
          {[110, 260].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="34" r="2.4" fill="#ff9ad6" />
              <circle cx={x + 7} cy="36" r="2" fill="#8ff0ff" />
            </g>
          ))}
        </>,
      )}
      <style>{`
        @keyframes sp-tw { 50% { opacity: .35 } }
        @keyframes sp-ff { 50% { transform: translateY(-6px); opacity: .55 } }
        @keyframes sp-shoot {
          0% { transform: translate(60px, 40px); opacity: 0 }
          3% { opacity: 1 }
          14% { transform: translate(250px, 105px); opacity: 0 }
          100% { transform: translate(250px, 105px); opacity: 0 }
        }
        .sp-tw { animation: sp-tw 3.2s ease-in-out infinite; }
        .sp-ff { animation: sp-ff 3s ease-in-out infinite; }
        .sp-shoot { animation: sp-shoot 7s ease-out 2s infinite; opacity: 0; }
        @media (prefers-reduced-motion: reduce) { .sp-tw, .sp-ff, .sp-shoot { animation: none; } }
      `}</style>
    </div>
  );
}

/** 층별 타일 좌표계 (너비 400 = 장면 한 폭) */
const TILE_VIEW = ["0 0 400 300", "0 0 400 120", "0 0 400 100", "0 0 400 100", "0 0 400 100"];

/** 큰 별 (x, y, 반지름) */
const BRIGHT: Array<[number, number, number]> = [
  [62, 54, 1.6],
  [196, 32, 1.3],
  [118, 122, 1.1],
  [250, 150, 1.2],
];

const FIREFLIES: Array<[number, number]> = [
  [36, 40],
  [120, 62],
  [205, 30],
  [290, 70],
  [356, 44],
];

/** 먼 별 한 장: 고정된 배치(씨앗 난수)로 매번 같은 하늘 (모듈을 불러올 때 한 번만 만든다) */
const STARS = (() => {
  let seed = 20261024;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 46 }, () => ({ x: rand() * 400, y: rand() * 260, r: 0.5 + rand() * 1.1, d: rand() * 3 }));
})();

function StarTile() {
  return (
    <>
      {STARS.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" className="sp-tw" style={{ animationDelay: `${st.d}s` }} opacity={0.5 + (i % 3) * 0.2} />
      ))}
    </>
  );
}

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
