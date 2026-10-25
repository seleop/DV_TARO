"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Glint, Nebula, Scene, StarField, cos, sin, rng, v } from "./common";
import { CrescentMoon } from "./art";

/**
 * 오늘의 운세 배경: 새벽빛 언덕길 (2026-10-25 사용자 결정: 해와 달이 함께 뜬 새벽, 운세 보는 중에는 걸음에 맞춰 흐름).
 * 고정: 밤에서 새벽으로 물드는 하늘 · 사라져 가는 별 · 초승달 · 언덕 너머 떠오르는 해(빛살이 천천히 돎) · 노을 성운.
 * 흐르는 층(walking=true면 오른쪽 → 왼쪽, 가까울수록 빠르게): 분홍 구름 · 먼 산 · 언덕과 나무 · 반딧불 · 꽃길.
 * 움직임은 각 층의 transform 만 바꾼다(레이아웃 다시 계산 없음). '동작 줄이기' 설정이면 흐르지 않는다.
 * 층은 가로 400 단위 그림 두 장을 이어 붙여 끊김 없이 돈다(양 끝 높이가 같다).
 */
const ID = "dw";
/** 걸을 때 각 층이 흐르는 빠르기(px/초): 구름 → 먼 산 → 언덕 → 반딧불 → 꽃길 */
const SPEEDS = [6, 12, 26, 44, 66];

export function DawnPath({ walking }: { walking: boolean }) {
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

  const strip = (i: number, cls: string, view: string, tile: ReactNode) => (
    <div
      ref={(el) => {
        strips.current[i] = el;
      }}
      className={`absolute left-0 flex w-[200%] will-change-transform ${cls}`}
    >
      {[0, 1].map((k) => (
        <svg key={k} viewBox={view} preserveAspectRatio="none" className="h-full w-1/2 shrink-0" aria-hidden>
          {tile}
        </svg>
      ))}
    </div>
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Sky />
      {strip(0, "top-[24%] h-[30%]", "0 0 400 180", <CloudTile />)}
      {strip(1, "bottom-[24%] h-[26%]", "0 0 400 120", <MountainTile />)}
      {strip(2, "bottom-[12%] h-[24%]", "0 0 400 110", <HillTile />)}
      {strip(3, "bottom-[10%] h-[18%]", "0 0 400 80", <FireflyTile />)}
      {strip(4, "bottom-0 h-[17%]", "0 0 400 90", <PathTile />)}
    </div>
  );
}

/** 고정된 하늘: 새벽 그라데이션 · 별 · 달 · 떠오르는 해 · 노을 성운 (흐르지 않음) */
function Sky() {
  const sx = 250;
  const sy = 352;
  return (
    <Scene id={ID}>
      <defs>
        <linearGradient id={`${ID}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#151a5a" />
          <stop offset=".28" stopColor="#3a2f84" />
          <stop offset=".5" stopColor="#8a4a96" />
          <stop offset=".66" stopColor="#e2768e" />
          <stop offset=".78" stopColor="#ffa47e" />
          <stop offset=".9" stopColor="#ffd39a" />
          <stop offset="1" stopColor="#ffe6b8" />
        </linearGradient>
        <radialGradient id={`${ID}-sun`}>
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset=".35" stopColor="#ffe9a8" />
          <stop offset=".7" stopColor="#ffbe7a" stopOpacity=".6" />
          <stop offset="1" stopColor="#ff9a7a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${ID}-fadeStars`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${ID}-starMask`}>
          <rect width="375" height="520" fill={`url(#${ID}-fadeStars)`} />
        </mask>
      </defs>
      <rect width="375" height="520" fill={`url(#${ID}-sky)`} />
      <Nebula id={`${ID}-n1`} cx={80} cy={190} rx={180} ry={70} color="#ff9ad6" seed={91} freq={0.014} cut={0.56} opacity={0.45} />
      <Nebula id={`${ID}-n2`} cx={300} cy={250} rx={190} ry={70} color="#ffd08a" seed={93} freq={0.015} cut={0.56} opacity={0.4} />
      <g mask={`url(#${ID}-starMask)`}>
        <StarField seed={95} n={170} y={[0, 300]} size={[0.25, 1.05]} halo={0.05} />
      </g>
      <Glint x={60} y={64} r={1.4} />
      <Glint x={300} y={44} r={1.1} delay={1.8} color="#cfe4ff" />
      <CrescentMoon id={`${ID}-moon`} x={78} y={128} r={16} />
      {/* 떠오르는 해: 큰 후광 + 천천히 도는 빛살 + 원반 */}
      <circle cx={sx} cy={sy} r={150} fill={`url(#${ID}-sun)`} opacity=".85" />
      <g className="hb-spin" style={v({ "--d": "120s", transformOrigin: `${sx}px ${sy}px` })} opacity=".26">
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          const a2 = a + 0.07;
          return <path key={i} d={`M${sx} ${sy} L${sx + cos(a) * 160} ${sy + sin(a) * 160} L${sx + cos(a2) * 160} ${sy + sin(a2) * 160} Z`} fill="#fff1c9" opacity={i % 2 ? 0.25 : 0.45} />;
        })}
      </g>
      <circle cx={sx} cy={sy} r={34} fill="#fff6d8" filter={`url(#${ID}-glow)`} />
      <circle cx={sx} cy={sy} r={30} fill="#fffbee" />
      {/* 날아가는 새 몇 마리 */}
      {[
        [150, 150, 1],
        [168, 140, 0.8],
        [186, 158, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} className="hb-float" style={v({ "--d": `${4 + i}s`, animationDelay: `${i * 0.6}s` })}>
          <path d={`M${x - 7 * s} ${y} q${3.5 * s} ${-4 * s} ${7 * s} 0 q${3.5 * s} ${-4 * s} ${7 * s} 0`} stroke="#4a2a5a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </Scene>
  );
}

/** 해 뜰 녘 노을 구름: 가로로 길게 흐르는 구름 띠 (위는 햇빛 받은 분홍·금빛, 아래는 라벤더 그늘, 가장자리는 흐림) */
function CloudTile() {
  const bands: Array<[number, number, number, number]> = [
    // x, y, 길이, 두께
    [70, 50, 110, 9],
    [200, 34, 90, 7],
    [300, 70, 120, 11],
    [130, 104, 140, 10],
    [330, 128, 90, 7],
    [40, 140, 80, 6],
  ];
  return (
    <>
      <defs>
        <linearGradient id="dw-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0dc" />
          <stop offset=".45" stopColor="#ffbcc4" />
          <stop offset="1" stopColor="#b07ab8" />
        </linearGradient>
        <filter id="dw-cloudBlur" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      {bands.map(([x, y, w, h], i) => (
        <g key={i} opacity={0.85 - (i % 3) * 0.12}>
          <ellipse cx={x} cy={y + h * 0.6} rx={w / 2 + 6} ry={h * 0.9} fill="#a070b0" opacity=".35" filter="url(#dw-cloudBlur)" />
          <ellipse cx={x} cy={y} rx={w / 2} ry={h} fill="url(#dw-cloud)" filter="url(#dw-cloudBlur)" />
          <ellipse cx={x - w * 0.18} cy={y - h * 0.55} rx={w * 0.22} ry={h * 0.75} fill="url(#dw-cloud)" filter="url(#dw-cloudBlur)" />
          <ellipse cx={x + w * 0.12} cy={y - h * 0.4} rx={w * 0.18} ry={h * 0.6} fill="url(#dw-cloud)" filter="url(#dw-cloudBlur)" />
          <path d={`M${x - w * 0.38} ${y - h * 0.5} Q${x} ${y - h * 1.3} ${x + w * 0.36} ${y - h * 0.45}`} stroke="#fff6e8" strokeWidth="1.2" fill="none" opacity=".75" />
        </g>
      ))}
    </>
  );
}

/** 먼 산: 라벤더 능선 두 겹 + 산허리 안개 (x=0·400 높이 같음) */
function MountainTile() {
  return (
    <>
      <path d="M0 70 L30 52 L62 62 L100 30 L136 56 L170 44 L206 20 L244 48 L280 36 L318 58 L352 34 L400 70 V120 H0Z" fill="#9a6ab0" opacity=".75" />
      <path d="M0 70 L30 52 L62 62 L100 30 L136 56 L170 44 L206 20 L244 48 L280 36 L318 58 L352 34 L400 70" stroke="#ffd0c0" strokeWidth="1.2" fill="none" opacity=".7" />
      <path d="M0 84 L44 70 L90 80 L140 62 L196 78 L250 64 L300 80 L350 66 L400 84 V120 H0Z" fill="#7a4a9a" />
      <rect x="0" y="94" width="400" height="26" fill="#f2b4c4" opacity=".35" />
    </>
  );
}

/** 언덕과 나무·풍차 (x=0·400 높이 같음) */
function HillTile() {
  return (
    <>
      <path d="M0 52 Q50 28 110 40 T230 36 T340 44 T400 52 V110 H0Z" fill="#5a2f7a" />
      <path d="M0 52 Q50 28 110 40 T230 36 T340 44 T400 52" stroke="#ffb8a8" strokeWidth="1.4" fill="none" opacity=".6" />
      {[
        [60, 36, 1],
        [84, 40, 0.7],
        [262, 38, 0.9],
        [360, 44, 0.75],
      ].map(([x, y, s], i) => (
        <g key={i} fill="#3a1c58">
          <rect x={x - 1.4 * s} y={y - 14 * s} width={2.8 * s} height={14 * s} />
          <circle cx={x} cy={y - 18 * s} r={9 * s} />
          <circle cx={x - 5 * s} cy={y - 13 * s} r={6 * s} />
          <circle cx={x + 5 * s} cy={y - 13 * s} r={6 * s} />
        </g>
      ))}
      {/* 작은 풍차 집 */}
      <g fill="#3a1c58">
        <path d="M168 40 L176 18 L184 40 Z" />
        <rect x="171" y="30" width="6" height="7" fill="#ffd98a" />
      </g>
      <g className="hb-spin" style={v({ "--d": "14s", transformOrigin: "176px 18px" })} stroke="#3a1c58" strokeWidth="2.2">
        <line x1="176" y1="6" x2="176" y2="30" />
        <line x1="164" y1="18" x2="188" y2="18" />
      </g>
    </>
  );
}

/** 반딧불·꽃가루 (길보다 조금 느리게) */
function FireflyTile() {
  const r = rng(123);
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const x = 20 + r() * 360;
        const y = 10 + r() * 60;
        return (
          <g key={i} className="hb-ff" style={v({ "--d": `${4 + r() * 3}s`, animationDelay: `${-r() * 6}s` })}>
            <circle cx={x} cy={y} r="5" fill="#fff3a8" opacity=".2" />
            <circle cx={x} cy={y} r="1.5" fill="#fff3a8" />
          </g>
        );
      })}
    </>
  );
}

/** 꽃길: 앞 언덕 · 빛나는 흙길 · 풀·꽃 (마스코트가 걷는 땅) */
function PathTile() {
  const r = rng(321);
  const flowers = Array.from({ length: 16 }, () => ({ x: r() * 400, y: 18 + r() * 14, c: ["#ff9ad6", "#ffe08a", "#ffffff", "#9ad8ff"][Math.floor(r() * 4)], s: 1.4 + r() * 1.2 }));
  return (
    <>
      <path d="M0 22 Q100 12 200 20 T400 22 V90 H0Z" fill="#3a1f52" />
      <path d="M0 22 Q100 12 200 20 T400 22" stroke="#ffb8a8" strokeWidth="1.4" fill="none" opacity=".55" />
      {/* 흙길 */}
      <path d="M0 52 Q100 44 200 50 T400 52 L400 70 Q300 64 200 68 T0 70 Z" fill="#7a4a6a" />
      <path d="M0 52 Q100 44 200 50 T400 52" stroke="#ffd0a0" strokeWidth="1.2" fill="none" opacity=".6" />
      {[30, 120, 210, 300, 390].map((x, i) => (
        <ellipse key={i} cx={x} cy={58 + (i % 2) * 3} rx="12" ry="3" fill="#a06a7a" />
      ))}
      {/* 풀 */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = (i * 13.3 + 4) % 400;
        const h = 6 + (i % 4) * 2;
        return <path key={i} d={`M${x} 26 q1 ${-h * 0.6} ${2.5} ${-h} M${x + 3} 26 q0 ${-h * 0.5} -1.5 ${-h * 0.8}`} stroke="#5a3a7a" strokeWidth="1.3" fill="none" />;
      })}
      {flowers.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.s * 2.4} fill={f.c} opacity=".18" />
          <circle cx={f.x} cy={f.y} r={f.s} fill={f.c} />
        </g>
      ))}
    </>
  );
}

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
