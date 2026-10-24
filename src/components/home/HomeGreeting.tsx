"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BRAND } from "@/config/brand";
import { FitCharacter } from "@/components/app/Screen";
import { SLOT_TITLE, formatHomeDate, pickGreeting, timeSlot } from "@/lib/home-greeting";

/** 별이가 들어올 때 띄우는 인사 말풍선(약 0.45초 뒤 2.4초)이 끝난 뒤에 홈 말풍선을 띄운다 */
const FIRST_BUBBLE_DELAY_MS = 2900;
/** 별이를 누르면 별이 자체 말풍선이 뜨므로 그동안 홈 말풍선을 숨긴다 (CharacterStage BUBBLE_MS) */
const TAP_HIDE_MS = 2400;

// 분 단위 시각. 서버 렌더에서는 null 이라 하이드레이션 뒤에만 시간대 문구를 그린다
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

/** 홈 장면: 날짜·시간대 인사 제목 + 별이 말풍선(누르면 다음 문구) + 남는 높이에 맞춘 별이 */
export function HomeGreeting({ name }: { name: string }) {
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);
  const [n, setN] = useState(0);
  const [shown, setShown] = useState(false);
  const [hiddenUntilTap, setHiddenUntilTap] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), FIRST_BUBBLE_DELAY_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const line = now ? pickGreeting(now, n) : null;
  const visible = shown && !hiddenUntilTap && line;

  return (
    // 작은 화면에서는 제목이 천막 줄무늬 위에 겹치므로 글자 뒤에 옅은 빛을 깔아 읽기 쉽게 한다
    <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(0.5rem,2.5dvh,1.75rem)] text-center [text-shadow:0_0_12px_rgba(255,236,220,0.95),0_0_3px_rgba(255,236,220,0.9)]">
      <p className="animate-rise h-[1.4em] text-[clamp(12px,1.9dvh,14px)] font-semibold text-ink-2">{now ? formatHomeDate(now) : ""}</p>
      <h1 className="animate-rise mt-0.5 max-w-full text-[clamp(22px,3.7dvh,30px)] font-extrabold leading-tight tracking-tight text-ink">
        <span className="block">{now ? SLOT_TITLE[timeSlot(now.getHours())] : " "}</span>
        <span className="block truncate text-accent">{name}님</span>
      </h1>

      {/* 말풍선 자리는 늘 잡아 두어 문구가 떠도 별이 크기가 바뀌지 않게 한다 */}
      <div className="mt-[clamp(0.25rem,1.5dvh,0.75rem)] flex h-[3.6rem] w-full shrink-0 items-end justify-center">
        <button
          type="button"
          onClick={() => setN((x) => x + 1)}
          aria-label={`${BRAND.characterName}의 다음 말 듣기`}
          tabIndex={visible ? 0 : -1}
          className={`relative max-w-[min(280px,86%)] rounded-[18px] bg-white px-4 py-2 text-[clamp(13px,2.1dvh,15px)] font-semibold leading-snug text-[#3d2a5c] shadow-[0_8px_20px_-8px_rgba(110,60,40,0.55)] transition duration-300 active:scale-95 ${
            visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
          }`}
        >
          <span key={n} className="block animate-rise">
            {line}
          </span>
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
        </button>
      </div>

      {/* 별이를 누르면 별이 말풍선과 겹치지 않게 홈 말풍선을 잠깐 숨긴다 */}
      <div
        className="flex min-h-0 w-full flex-1 flex-col"
        onClickCapture={() => {
          setHiddenUntilTap(true);
          clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => {
            setHiddenUntilTap(false);
            setN((x) => x + 1);
          }, TAP_HIDE_MS);
        }}
      >
        <FitCharacter min={90} max={300} className="w-full items-end" />
      </div>
      <span className="sr-only" aria-live="polite">
        {visible ? line : ""}
      </span>
    </div>
  );
}
