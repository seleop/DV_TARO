"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { useMascotName } from "@/components/MascotName";
import { HOME_MENUS } from "@/lib/home-menu";

/**
 * 홈 메뉴: 카드를 좌우로 넘겨 고른다 (2026-10-25 사용자 결정).
 * 가운데 카드가 지금 고른 메뉴이고 양옆 카드가 살짝 보여 넘길 수 있다는 걸 알려 준다.
 * 옆 카드를 누르면 그 카드로 넘어가고, 가운데 카드를 누르면 그 메뉴로 들어간다. 아래 점으로도 옮길 수 있다.
 * 고른 메뉴가 바뀌면 onIndexChange 로 알려 마스코트가 의상·말을 바꾼다 (HomeView).
 */
export function HomeMenu({
  index,
  onIndexChange,
  hasPrimary,
  viewedToday,
}: {
  index: number;
  onIndexChange: (i: number) => void;
  hasPrimary: boolean;
  viewedToday: boolean;
}) {
  const mascot = useMascotName();
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLAnchorElement | null>>([]);
  const raf = useRef(0);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /** 카드 i 를 트랙 가운데에 두는 스크롤 위치 (트랙이 offsetParent) */
  const centerOf = (i: number) => {
    const el = track.current;
    const c = cards.current[i];
    return el && c ? c.offsetLeft + c.offsetWidth / 2 - el.clientWidth / 2 : 0;
  };
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const to = Math.max(0, Math.min(HOME_MENUS.length - 1, i));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: centerOf(to), behavior: reduce ? "auto" : "smooth" });
  };
  const onScroll = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = track.current;
      if (!el) return;
      // 트랙 가운데에 가장 가까운 카드
      let i = 0;
      let best = Infinity;
      HOME_MENUS.forEach((_, k) => {
        const d = Math.abs(centerOf(k) - el.scrollLeft);
        if (d < best) [best, i] = [d, k];
      });
      if (i !== indexRef.current) {
        indexRef.current = i;
        onIndexChange(i);
      }
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else return;
    e.preventDefault();
  };

  return (
    <nav aria-label="메뉴" aria-roledescription="넘기는 메뉴" className="flex w-full shrink-0 flex-col pb-[clamp(0.5rem,1.6dvh,0.9rem)]" onKeyDown={onKey}>
      <div ref={track} onScroll={onScroll} className="no-scrollbar relative -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain py-1">
        {/* 양 끝 빈 칸: 첫·마지막 카드도 가운데까지 오게 (오른쪽 안쪽 여백은 스크롤 범위에 안 잡히는 브라우저가 있어 칸으로 둔다) */}
        <span aria-hidden className="w-[calc(12%-0.75rem)] shrink-0" />
        {HOME_MENUS.map((m, i) => {
          const active = i === index;
          const today = m.id === "today";
          const href = today && !hasPrimary ? "/me/profile" : m.href;
          const sub = today && !hasPrimary ? "생년월일을 넣으면 볼 수 있어요" : m.sub(mascot);
          return (
            <Link
              key={m.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              href={href}
              aria-current={active ? "true" : undefined}
              aria-label={`${m.title}${today && viewedToday ? " (오늘 봤어요)" : ""}${active ? "" : " · 눌러서 이 메뉴로 넘기기"}`}
              onClick={(e) => {
                // 옆 카드를 누르면 들어가지 않고 그 카드로 넘긴다
                if (!active) {
                  e.preventDefault();
                  go(i);
                }
              }}
              className={`relative flex h-[clamp(7.25rem,17dvh,8.75rem)] w-[76%] shrink-0 snap-center snap-always flex-col justify-between overflow-hidden rounded-[26px] border border-white/15 p-4 text-left text-white outline-none transition-[transform,opacity,box-shadow] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#d9ccff] motion-reduce:transition-none ${
                active ? "scale-100 opacity-100 shadow-[0_14px_30px_-14px_rgba(10,6,40,0.95)] active:scale-[0.98]" : "scale-[0.9] opacity-55"
              }`}
              style={{ background: `linear-gradient(150deg, ${m.tint[0]}, ${m.tint[1]})` }}
            >
              {/* 장식: 큰 그림 무늬 · 잔별 · 위쪽 빛 테두리 */}
              <span aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 h-36 w-36 rounded-full border border-white/15" />
              <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-4 h-20 w-20 rounded-full border border-white/10 bg-white/5" />
              <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {[
                [18, 22],
                [62, 14],
                [84, 46],
                [40, 70],
              ].map(([x, y], k) => (
                <span key={k} aria-hidden className="pointer-events-none absolute h-[3px] w-[3px] rounded-full bg-white/70" style={{ left: `${x}%`, top: `${y}%` }} />
              ))}

              <span className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-[24px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" aria-hidden>
                  {m.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[18px] font-bold leading-tight">{today && !hasPrimary ? "생년월일 입력하기" : m.title}</span>
                    {today && hasPrimary && viewedToday && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold leading-none text-[#4a2fa0]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                        오늘 봤어요
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-white/80">{sub}</span>
                </span>
              </span>
              <span className="relative flex justify-end">
                <span className={`inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1.5 text-[13px] font-semibold transition-opacity ${active ? "opacity-100" : "opacity-0"}`}>
                  {today && viewedToday ? "다시 보기" : "바로 보기"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          );
        })}
        <span aria-hidden className="w-[calc(12%-0.75rem)] shrink-0" />
      </div>
      {/* 몇 번째 카드인지 + 눌러서 옮기기 */}
      <div className="mt-1.5 flex items-center justify-center gap-0.5" role="group" aria-label="메뉴 고르기">
        {HOME_MENUS.map((m, i) => (
          <button key={m.id} type="button" onClick={() => go(i)} aria-label={`${m.title} 카드로`} aria-pressed={i === index} className="flex h-7 items-center justify-center px-1.5">
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/35"}`} />
          </button>
        ))}
      </div>
    </nav>
  );
}
