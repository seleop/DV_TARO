"use client";

import { useId, type ReactNode } from "react";

/**
 * 타로 카드 그림 (2026-10-28 사용자 결정: 뽑은 카드도 배경 성소의 금테 카드와 같은 그림체).
 * 남색 바탕 + 금테 + 모서리 장식 + 위쪽 숫자 + 가운데 상징.
 *  - 메이저 22장: 카드마다 상징 하나 (바보=흰 장미, 마법사=무한대와 지팡이, … 세계=월계관)
 *  - 마이너 56장: 수트 상징(완드·컵·소드·펜타클)을 숫자만큼 배치, 궁정 카드는 큰 상징 + 관(왕관·기사 투구 등)
 *  - 역방향은 가운데 그림만 거꾸로 (숫자는 바로 읽히게)
 * 카드 이름은 작은 카드에서 읽기 어려워 그림 안에 넣지 않는다 (쓰는 곳에서 카드 아래 글자로).
 * 필터를 쓰지 않는다 (뒤집기·떠다니기 같은 움직임 중에도 가볍게).
 */
const GOLD = "#f4d38a";
const INK = "#ffe4a0";
const W = 60;
const H = 100;

function useSvgId() {
  // useId 는 ':' 같은 글자를 담아 url(#…) 참조가 깨질 수 있어 영문·숫자만 남긴다
  return "tc" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

type Card = { id: string; reversed?: boolean };

/** "major-10" → 메이저 번호, "cups-3" → 수트·랭크 */
function parse(id: string): { major: number } | { suit: Suit; rank: string } | null {
  const [a, b] = id.split("-");
  if (a === "major") {
    const n = Number(b);
    return Number.isInteger(n) && n >= 0 && n <= 21 ? { major: n } : null;
  }
  if (a === "wands" || a === "cups" || a === "swords" || a === "pentacles") return { suit: a, rank: b };
  return null;
}
type Suit = "wands" | "cups" | "swords" | "pentacles";

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
const RANK_LABEL: Record<string, string> = { ace: "ACE", page: "PAGE", knight: "KNIGHT", queen: "QUEEN", king: "KING" };

/** 카드 위쪽 숫자 */
export function cardNumeral(id: string) {
  const p = parse(id);
  if (!p) return "";
  if ("major" in p) return ROMAN[p.major];
  return RANK_LABEL[p.rank] ?? ROMAN[Number(p.rank)] ?? p.rank;
}

/** 카드 앞면 */
export function TarotCardFace({ card, className = "" }: { card: Card; className?: string }) {
  const id = useSvgId();
  const p = parse(card.id);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4b2a9c" />
          <stop offset=".55" stopColor="#25146c" />
          <stop offset="1" stopColor="#3b1a6e" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={INK} stopOpacity=".26" />
          <stop offset="1" stopColor={INK} stopOpacity="0" />
        </radialGradient>
      </defs>
      <Frame bg={`url(#${id}-bg)`} />
      <rect x="7.5" y="15" width="45" height="70" rx="2" fill="#170c45" stroke={GOLD} strokeWidth=".5" opacity=".95" />
      <circle cx="30" cy="50" r="24" fill={`url(#${id}-glow)`} />
      {/* 잔별 */}
      {[
        [12, 20],
        [47, 23],
        [11, 72],
        [48, 79],
        [44, 56],
        [15, 46],
        [30, 81],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r=".55" fill="#ffe7b0" opacity=".8" />
      ))}
      <g transform={`translate(30 50)${card.reversed ? " rotate(180)" : ""}`}>{p ? "major" in p ? <Major n={p.major} /> : <Minor suit={p.suit} rank={p.rank} /> : <Emblem />}</g>
      <text x="30" y="11.4" textAnchor="middle" fontSize="6" fill={GOLD} fontFamily="Georgia, 'Times New Roman', serif" letterSpacing=".5">
        {cardNumeral(card.id)}
      </text>
      {/* 아래 장식 */}
      <path d="M30 88.6l1.6 1.8-1.6 1.8-1.6-1.8z" fill={GOLD} />
      <path d="M20 90.4h7M33 90.4h7" stroke={GOLD} strokeWidth=".5" opacity=".8" />
    </svg>
  );
}

/** 카드 뒷면: 달·별 문장 + 금빛 마름모 무늬 */
export function TarotCardBack({ className = "" }: { className?: string }) {
  const id = useSvgId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33208a" />
          <stop offset=".6" stopColor="#1a0f52" />
          <stop offset="1" stopColor="#2a1462" />
        </linearGradient>
        <pattern id={`${id}-p`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45 30 50)">
          <path d="M0 0h8v8" fill="none" stroke={GOLD} strokeWidth=".35" opacity=".35" />
        </pattern>
      </defs>
      <Frame bg={`url(#${id}-bg)`} />
      <rect x="7.5" y="7.5" width="45" height="85" rx="2" fill={`url(#${id}-p)`} stroke={GOLD} strokeWidth=".5" opacity=".9" />
      <g transform="translate(30 50)">
        <Emblem />
      </g>
    </svg>
  );
}

/** 바깥 금테·안쪽 테·모서리 장식 (앞·뒤 공통) */
function Frame({ bg }: { bg: string }) {
  return (
    <>
      <rect x=".8" y=".8" width={W - 1.6} height={H - 1.6} rx="6" fill={bg} stroke={GOLD} strokeWidth="1.6" />
      <rect x="4" y="4" width={W - 8} height={H - 8} rx="3.5" fill="none" stroke={GOLD} strokeWidth=".6" opacity=".85" />
      {[
        [4, 4],
        [W - 4, 4],
        [4, H - 4],
        [W - 4, H - 4],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.8" fill={GOLD} />
          <path d={`M${x - 3} ${y}h6M${x} ${y - 3}v6`} stroke={GOLD} strokeWidth=".5" />
        </g>
      ))}
    </>
  );
}

/** 뒷면·알 수 없는 카드의 문장: 고리 안의 초승달과 별 */
function Emblem() {
  return (
    <g>
      <circle r="15" fill="#170c45" stroke={GOLD} strokeWidth="1" />
      <circle r="12" fill="none" stroke={GOLD} strokeWidth=".4" strokeDasharray="1.2 1.6" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={round(Math.cos(a) * 18.5)} cy={round(Math.sin(a) * 18.5)} r={i % 2 ? 0.7 : 1.1} fill={GOLD} />;
      })}
      <path d="M2 -9a9 9 0 1 0 5 15.6a7.2 7.2 0 1 1 -5 -15.6Z" fill={INK} />
      <Star4 x={4.5} y={-1} r={3.4} />
    </g>
  );
}

/* ───────── 메이저 아르카나 상징 (가운데 0,0 기준, 반지름 약 16) ───────── */

function Major({ n }: { n: number }) {
  const f = { fill: INK };
  const st = { fill: "none", stroke: INK, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (n) {
    case 0: // 바보: 흰 장미와 줄기
      return (
        <g>
          <path d="M0 4V15M0 10q4-1 5-5" {...st} strokeWidth="1" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} cx={round(Math.cos(a) * 4.6)} cy={round(Math.sin(a) * 4.6 - 4)} r="3.6" {...f} opacity=".92" />;
          })}
          <circle cy="-4" r="2.4" fill="#c99a3a" />
          <Sun x={10} y={-13} r={3} />
        </g>
      );
    case 1: // 마법사: 무한대 + 지팡이 + 네 원소 점
      return (
        <g>
          <Lemniscate y={-11} w={8} />
          <path d="M0 -4V15" {...st} strokeWidth="1.8" />
          <circle cy="-4.5" r="1.6" {...f} />
          {[-9, -3, 3, 9].map((x) => (
            <circle key={x} cx={x} cy="9" r="1" {...f} opacity=".75" />
          ))}
        </g>
      );
    case 2: // 여사제: 두 기둥 사이 초승달
      return (
        <g>
          <rect x="-12.5" y="-14" width="4" height="28" rx=".6" {...f} opacity=".9" />
          <rect x="8.5" y="-14" width="4" height="28" rx=".6" fill="none" stroke={INK} strokeWidth=".9" />
          <path d="M1.5 -8a6.5 6.5 0 1 0 3.6 11.4a5.2 5.2 0 1 1 -3.6 -11.4Z" {...f} />
          <path d="M-5 9h10" {...st} strokeWidth=".7" />
        </g>
      );
    case 3: // 여황제: 금성 기호 + 별 관
      return (
        <g>
          <circle cy="-3" r="6.5" {...st} strokeWidth="1.6" />
          <path d="M0 3.5V15M-4.5 9.5h9" {...st} strokeWidth="1.6" />
          {[-12, -6, 0, 6, 12].map((x, i) => (
            <circle key={x} cx={x} cy={-15 + Math.abs(i - 2) * 1.6} r=".9" {...f} />
          ))}
        </g>
      );
    case 4: // 황제: 왕관
      return (
        <g>
          <path d="M-11 6V-6L-5.5 0L0 -10L5.5 0L11 -6V6Z" {...f} />
          <rect x="-11" y="7.5" width="22" height="3.6" rx=".8" {...f} opacity=".85" />
          {[-11, 0, 11].map((x, i) => (
            <circle key={x} cx={x} cy={i === 1 ? -11.5 : -7.5} r="1.4" {...f} />
          ))}
          <circle cy="2" r="1.6" fill="#7a3aa8" />
        </g>
      );
    case 5: // 교황: 엇갈린 두 열쇠
      return (
        <g>
          {[-34, 34].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <circle cy="-11" r="3.4" {...st} strokeWidth="1.3" />
              <path d="M0 -7.6V13M0 9h3.4M0 12h2.4" {...st} strokeWidth="1.3" />
            </g>
          ))}
        </g>
      );
    case 6: // 연인: 하트와 빛
      return (
        <g>
          <path d="M0 11C-13 2 -9 -9 0 -2.5C9 -9 13 2 0 11Z" {...f} />
          {[-35, 0, 35].map((a) => (
            <path key={a} d="M0 -9V-15" transform={`rotate(${a})`} {...st} strokeWidth="1" />
          ))}
        </g>
      );
    case 7: // 전차: 별 지붕 수레와 두 바퀴
      return (
        <g>
          <path d="M-10 -4Q0 -13 10 -4" {...st} strokeWidth="1.2" />
          <Star4 x={0} y={-10.5} r={2.6} />
          <rect x="-9" y="-4" width="18" height="11" rx="1.2" {...st} strokeWidth="1.3" />
          <path d="M-4 1.5h8" {...st} strokeWidth=".8" />
          {[-7, 7].map((x) => (
            <circle key={x} cx={x} cy="11" r="3.4" {...st} strokeWidth="1.2" />
          ))}
        </g>
      );
    case 8: // 힘: 무한대 + 꽃사슬 고리
      return (
        <g>
          <Lemniscate y={-12} w={7} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={round(Math.cos(a) * 9)} cy={round(Math.sin(a) * 9 + 4)} r={i % 2 ? 1 : 1.6} {...f} />;
          })}
          <path d="M-3 4q3 -4 6 0q-3 4 -6 0Z" {...f} />
        </g>
      );
    case 9: // 은둔자: 별을 담은 등불 + 지팡이
      return (
        <g>
          <path d="M-11 -14V15" {...st} strokeWidth="1.2" />
          <path d="M0 -15V-11" {...st} strokeWidth="1" />
          <path d="M-5 -11H5L6.5 -7H-6.5Z" {...f} />
          <rect x="-5.5" y="-7" width="11" height="13" rx="1" {...st} strokeWidth="1.1" />
          <Star6 x={0} y={-0.5} r={3.6} />
          <path d="M-4 6H4L3 9H-3Z" {...f} />
        </g>
      );
    case 10: // 운명의 수레바퀴
      return (
        <g {...st}>
          <circle r="14" strokeWidth="1.4" />
          <circle r="10.5" strokeWidth=".6" />
          <circle r="3.5" fill={INK} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <line key={i} x1={round(Math.cos(a) * 3.5)} y1={round(Math.sin(a) * 3.5)} x2={round(Math.cos(a) * 14)} y2={round(Math.sin(a) * 14)} strokeWidth=".8" />;
          })}
          {Array.from({ length: 4 }, (_, i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return <circle key={i} cx={round(Math.cos(a) * 17.5)} cy={round(Math.sin(a) * 17.5)} r="1.4" fill={INK} stroke="none" />;
          })}
        </g>
      );
    case 11: // 정의: 저울
      return (
        <g>
          <path d="M0 -14V12M-6 13h12M-12 -8H12" {...st} strokeWidth="1.3" />
          <circle cy="-14" r="1.6" {...f} />
          {[-12, 12].map((x) => (
            <g key={x}>
              <path d={`M${x} -8L${x - 4} 2M${x} -8L${x + 4} 2`} {...st} strokeWidth=".6" />
              <path d={`M${x - 5} 2h10q-1 4 -5 4q-4 0 -5 -4Z`} {...f} />
            </g>
          ))}
        </g>
      );
    case 12: // 매달린 사람: 타우 십자 + 거꾸로 매달린 머리의 빛 고리
      return (
        <g>
          <path d="M-11 -13H11M0 -13V3" {...st} strokeWidth="1.6" />
          <circle cy="8.5" r="4.2" {...f} />
          <circle cy="8.5" r="7" {...st} strokeWidth=".6" strokeDasharray="1.2 1.4" />
        </g>
      );
    case 13: // 죽음: 두 탑 사이로 떠오르는 해 (끝과 새 시작)
      return (
        <g>
          <path d="M-14 7H14" {...st} strokeWidth="1" />
          <path d="M-7 7A7 7 0 0 1 7 7Z" {...f} />
          {[-60, -30, 0, 30, 60].map((a) => {
            const t = ((a - 90) * Math.PI) / 180;
            return <path key={a} d={`M${round(Math.cos(t) * 8.5)} ${round(7 + Math.sin(t) * 8.5)}L${round(Math.cos(t) * 12)} ${round(7 + Math.sin(t) * 12)}`} {...st} strokeWidth=".9" />;
          })}
          <path d="M-13 7V-6H-9V7M9 7V-6H13V7" {...st} strokeWidth="1" />
          <path d="M-13 -6l2 -3l2 3M9 -6l2 -3l2 3" {...f} />
          <path d="M-10 12q10 4 20 0" {...st} strokeWidth=".6" opacity=".8" />
        </g>
      );
    case 14: // 절제: 두 잔 사이로 흐르는 물
      return (
        <g>
          <g transform="translate(-7 -6) rotate(-20)">
            <Cup s={0.6} />
          </g>
          <g transform="translate(7 8) rotate(15)">
            <Cup s={0.6} />
          </g>
          <path d="M-3 -9Q8 -7 6 3" {...st} strokeWidth="1" strokeDasharray="1.6 1.2" />
          <path d="M-3 -15l3 5l3 -5Z" {...st} strokeWidth=".7" />
        </g>
      );
    case 15: // 악마: 뿔과 사슬
      return (
        <g>
          <path d="M-9 -2C-12 -8 -11 -13 -7 -15C-8 -11 -6 -7 -3 -4ZM9 -2C12 -8 11 -13 7 -15C8 -11 6 -7 3 -4Z" {...f} />
          <circle cy="-3" r="2" {...f} />
          {[3, 9].map((y, i) => (
            <ellipse key={y} cx={i ? 2 : -2} cy={y} rx="3.2" ry="2.2" {...st} strokeWidth="1.1" />
          ))}
          <ellipse cx="-2" cy="14" rx="3.2" ry="2.2" {...st} strokeWidth="1.1" />
        </g>
      );
    case 16: // 탑: 번개 맞은 탑
      return (
        <g>
          <path d="M-6 15V-7H6V15Z" {...st} strokeWidth="1.2" />
          <path d="M-7 -7V-11H-4V-9H-1.5V-11H1.5V-9H4V-11H7V-7Z" {...f} />
          <path d="M-2 15V9a2 2 0 0 1 4 0V15" {...f} opacity=".8" />
          <path d="M14 -16L6 -8L10 -8L3 0" {...st} strokeWidth="1.4" />
          {[
            [-11, 0],
            [-12, 7],
            [11, 6],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r=".9" {...f} />
          ))}
        </g>
      );
    case 17: // 별
      return (
        <g>
          <path
            d={
              Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 ? 3.6 : i % 4 ? 9 : 16;
                return `${i ? "L" : "M"}${round(Math.cos(a) * r)} ${round(Math.sin(a) * r)}`;
              }).join("") + "Z"
            }
            {...f}
          />
          {[
            [-12, -10],
            [12, -12],
            [-13, 9],
            [13, 10],
            [0, 15],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.2" {...f} />
          ))}
        </g>
      );
    case 18: // 달
      return (
        <g>
          <circle r="13" {...st} strokeWidth=".5" opacity=".6" />
          <path d="M3 -11a11 11 0 1 0 6 19a9 9 0 1 1 -6 -19Z" {...f} />
          {[-14, 14].map((x) => (
            <path key={x} d={`M${x - 2} 16v-6l2 -2l2 2v6Z`} {...f} opacity=".7" />
          ))}
        </g>
      );
    case 19: // 태양
      return <Sun x={0} y={0} r={7.5} rays={16} long={17} face />;
    case 20: // 심판: 나팔과 빛
      return (
        <g>
          <path d="M-12 -9L4 -1L6 -5L8 4L4 3Z" {...f} />
          <path d="M-12 -9l-1.5 -1.5" {...st} strokeWidth="1.2" />
          {[-20, 0, 20, 40].map((a) => (
            <path key={a} d="M10 0h6" transform={`rotate(${a} 8 0)`} {...st} strokeWidth=".9" />
          ))}
          <path d="M-4 -5V-15M-4 -15h6v4h-6" {...st} strokeWidth=".8" />
          <path d="M-12 12q12 -6 24 0" {...st} strokeWidth=".8" />
        </g>
      );
    default: // 21 세계: 월계관 + 별
      return (
        <g>
          <ellipse rx="11" ry="15" {...st} strokeWidth="1.6" strokeDasharray="2 1" />
          <path d="M0 -7l2 5h4l-3 3l1 5l-4 -3l-4 3l1 -5l-3 -3h4Z" {...f} />
        </g>
      );
  }
}

/* ───────── 마이너 아르카나: 수트 상징을 숫자만큼 ───────── */

/** 2~10 의 상징 자리 (판 가운데 기준) */
const PIPS: Record<number, Array<[number, number]>> = {
  2: [
    [0, -15],
    [0, 15],
  ],
  3: [
    [0, -19],
    [0, 0],
    [0, 19],
  ],
  4: [
    [-10, -13],
    [10, -13],
    [-10, 13],
    [10, 13],
  ],
  5: [
    [-10, -15],
    [10, -15],
    [0, 0],
    [-10, 15],
    [10, 15],
  ],
  6: [
    [-10, -19],
    [10, -19],
    [-10, 0],
    [10, 0],
    [-10, 19],
    [10, 19],
  ],
  7: [
    [-10, -20],
    [10, -20],
    [0, -10],
    [-10, 0],
    [10, 0],
    [-10, 20],
    [10, 20],
  ],
  8: [
    [-10, -21],
    [10, -21],
    [0, -10.5],
    [-10, 0],
    [10, 0],
    [0, 10.5],
    [-10, 21],
    [10, 21],
  ],
  9: [
    [-10, -22],
    [10, -22],
    [-10, -7.5],
    [10, -7.5],
    [0, 0],
    [-10, 7.5],
    [10, 7.5],
    [-10, 22],
    [10, 22],
  ],
  10: [
    [-10, -23],
    [10, -23],
    [0, -15.5],
    [-10, -8],
    [10, -8],
    [-10, 8],
    [10, 8],
    [0, 15.5],
    [-10, 23],
    [10, 23],
  ],
};

function Minor({ suit, rank }: { suit: Suit; rank: string }) {
  const n = Number(rank);
  if (PIPS[n]) {
    const s = n >= 8 ? 0.38 : n >= 5 ? 0.42 : 0.5;
    return (
      <g>
        {PIPS[n].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <SuitGlyph suit={suit} />
          </g>
        ))}
      </g>
    );
  }
  if (rank === "ace")
    return (
      <g>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 -14.5V-18" transform={`rotate(${i * 30})`} stroke={INK} strokeWidth=".7" strokeLinecap="round" opacity=".8" />
        ))}
        <g transform="scale(1.15)">
          <SuitGlyph suit={suit} />
        </g>
      </g>
    );
  // 궁정 카드: 큰 상징 + 위에 관
  return (
    <g>
      <g transform="translate(0 4) scale(.9)">
        <SuitGlyph suit={suit} />
      </g>
      <g transform="translate(0 -15)">
        <CourtMark rank={rank} />
      </g>
    </g>
  );
}

/** 수트 상징 (가운데 0,0, 반지름 약 11) */
function SuitGlyph({ suit }: { suit: Suit }) {
  const st = { fill: "none", stroke: INK, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (suit === "wands")
    return (
      <g>
        <path d="M-4 11L4 -11" {...st} strokeWidth="3" />
        <path d="M2.2 -6q4 -1 5 -5q-4 0 -5 5ZM-1 2q-4 -1 -5.5 2.5q4 1 5.5 -2.5Z" fill={INK} />
        <circle cx="4.3" cy="-11.4" r="1.7" fill={INK} />
      </g>
    );
  if (suit === "cups") return <Cup s={1} />;
  if (suit === "swords")
    return (
      <g>
        <path d="M0 -12L2.2 -6V5H-2.2V-6Z" fill={INK} />
        <path d="M-6.5 5.5H6.5" {...st} strokeWidth="2" />
        <path d="M0 6V10.5" {...st} strokeWidth="2.2" />
        <circle cy="12" r="1.6" fill={INK} />
      </g>
    );
  return (
    <g>
      <circle r="10" fill="#c99a3a" opacity=".35" />
      <circle r="10" {...st} strokeWidth="1.4" />
      <path
        d={
          Array.from({ length: 5 }, (_, i) => {
            const a = ((i * 2) / 5) * Math.PI * 2 - Math.PI / 2;
            return `${i ? "L" : "M"}${round(Math.cos(a) * 7.4)} ${round(Math.sin(a) * 7.4)}`;
          }).join("") + "Z"
        }
        {...st}
        strokeWidth="1"
      />
    </g>
  );
}

/** 궁정 카드 관: 시종=깃털, 기사=투구, 여왕=작은 관, 왕=왕관 */
function CourtMark({ rank }: { rank: string }) {
  const f = { fill: INK };
  if (rank === "king") return <path d="M-7 3V-4L-3.5 0L0 -6L3.5 0L7 -4V3Z" {...f} />;
  if (rank === "queen")
    return (
      <g>
        <path d="M-6 3Q0 -1 6 3L5 -2L2.5 0.5L0 -4L-2.5 0.5L-5 -2Z" {...f} />
        <circle cy="-5" r="1.2" {...f} />
      </g>
    );
  if (rank === "knight") return <path d="M-5 4V-1Q-5 -6 0 -6Q5 -6 5 -1V4ZM-5 0H5M0 -6V-9q3 0 5 2" fill={INK} stroke={INK} strokeWidth=".6" />;
  return <path d="M-4 4Q-2 -4 5 -7Q2 -1 -1 1Q-2 3 -4 4Z" {...f} />;
}

function Cup({ s }: { s: number }) {
  return (
    <g transform={`scale(${s})`} fill={INK}>
      <path d="M-7.5 -10H7.5Q7.5 1 0 2.4Q-7.5 1 -7.5 -10Z" />
      <rect x="-1.2" y="2" width="2.4" height="6" />
      <ellipse cy="9.4" rx="5.5" ry="1.8" />
      <path d="M-5 -7.5H5" stroke="#170c45" strokeWidth=".8" />
    </g>
  );
}

/* ───────── 작은 부품 ───────── */

function Lemniscate({ y, w }: { y: number; w: number }) {
  const h = w * 0.55;
  return (
    <path
      d={`M${-w} ${y}C${-w} ${y - h} ${-w * 0.25} ${y - h} 0 ${y}C${w * 0.25} ${y + h} ${w} ${y + h} ${w} ${y}C${w} ${y - h} ${w * 0.25} ${y - h} 0 ${y}C${-w * 0.25} ${y + h} ${-w} ${y + h} ${-w} ${y}Z`}
      fill="none"
      stroke={INK}
      strokeWidth="1.3"
    />
  );
}

function Sun({ x, y, r, rays = 12, long, face = false }: { x: number; y: number; r: number; rays?: number; long?: number; face?: boolean }) {
  const L = long ?? r * 1.9;
  const parts: ReactNode[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const r2 = i % 2 ? L * 0.78 : L;
    parts.push(
      <path
        key={i}
        d={`M${round(x + Math.cos(a - 0.12) * r * 1.05)} ${round(y + Math.sin(a - 0.12) * r * 1.05)}L${round(x + Math.cos(a) * r2)} ${round(y + Math.sin(a) * r2)}L${round(x + Math.cos(a + 0.12) * r * 1.05)} ${round(y + Math.sin(a + 0.12) * r * 1.05)}Z`}
        fill={INK}
      />,
    );
  }
  return (
    <g>
      {parts}
      <circle cx={x} cy={y} r={r} fill={INK} />
      {face && (
        <g fill="none" stroke="#8a5a20" strokeWidth=".7" strokeLinecap="round">
          <circle cx={x - 2.4} cy={y - 1} r=".5" fill="#8a5a20" />
          <circle cx={x + 2.4} cy={y - 1} r=".5" fill="#8a5a20" />
          <path d={`M${x - 2.6} ${y + 2.2}q2.6 2.4 5.2 0`} />
        </g>
      )}
    </g>
  );
}

function Star4({ x, y, r }: { x: number; y: number; r: number }) {
  const q = r * 0.28;
  return <path d={`M${x} ${y - r}L${x + q} ${y - q}L${x + r} ${y}L${x + q} ${y + q}L${x} ${y + r}L${x - q} ${y + q}L${x - r} ${y}L${x - q} ${y - q}Z`} fill={INK} />;
}

function Star6({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <path
      d={
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 ? r * 0.45 : r;
          return `${i ? "L" : "M"}${round(x + Math.cos(a) * rr)} ${round(y + Math.sin(a) * rr)}`;
        }).join("") + "Z"
      }
      fill={INK}
    />
  );
}

/** 서버·브라우저가 같은 값을 그리게 삼각함수 값을 반올림 (하이드레이션 경고 방지) */
function round(v: number) {
  return Math.round(v * 1000) / 1000;
}
