"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BRAND } from "@/config/brand";
import { MyButton } from "@/components/app/HomeButton";
import { FitCharacter } from "@/components/app/Screen";
import { pickGreeting } from "@/lib/home-greeting";

/** 별이가 들어올 때 띄우는 인사 말풍선(약 0.45초 뒤 2.4초)이 끝난 뒤에 홈 말풍선을 띄운다 */
const FIRST_BUBBLE_DELAY_MS = 2900;
/** 별이를 누르면 별이 자체 말풍선이 뜨므로 그동안 홈 말풍선을 숨긴다 (CharacterStage BUBBLE_MS) */
const TAP_HIDE_MS = 2400;

// 분 단위 시각. 서버 렌더에서는 null 이라 하이드레이션 뒤에만 시간대 문구를 그린다.
// 홈 화면에 둔 채 앱을 내렸다가 다시 열면(아침 → 저녁) 바로 지금 시간대로 바꾼다
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 30_000);
  document.addEventListener("visibilitychange", cb);
  window.addEventListener("pageshow", cb); // iOS Safari 뒤로 가기 캐시에서 돌아올 때
  return () => {
    clearInterval(t);
    document.removeEventListener("visibilitychange", cb);
    window.removeEventListener("pageshow", cb);
  };
};
const minuteNow = () => Math.floor(Date.now() / 60_000);

/** 홈 장면: MY 버튼 + 별이 말풍선(시간대·요일 문구, 누르면 다음 문구) + 남는 높이에 맞춘 별이 */
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
    // 날짜·인사 제목은 없앴다(2026-10-24 사용자 결정). 위는 MY 버튼, 그 아래 말풍선, 나머지는 별이
    <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3.25rem,8dvh,4.5rem)] text-center">
      <h1 className="sr-only">{name}님의 홈</h1>
      {/* 밤하늘 배경(scene-dark)에서는 어두운 유리 버튼 */}
      <MyButton className="[.scene-dark_&]:bg-white/12 [.scene-dark_&]:text-white [.scene-dark_&]:ring-1 [.scene-dark_&]:ring-white/25" />

      {/* 말풍선 자리는 늘 잡아 두어 문구가 떠도 별이 크기가 바뀌지 않게 한다 */}
      <div className="flex h-[3.6rem] w-full shrink-0 items-end justify-center">
        <button
          type="button"
          onClick={() => setN((x) => x + 1)}
          aria-label={`${BRAND.characterName}의 다음 말 듣기`}
          tabIndex={visible ? 0 : -1}
          // 꼬리(아래 가운데)에서 톡 튀어나오듯 커지며 나타난다. 동작 줄이기 설정이면 바로 보인다
          className={`relative max-w-[min(280px,86%)] origin-bottom rounded-[18px] bg-white px-4 py-2 text-[clamp(13px,2.1dvh,15px)] font-semibold leading-snug text-[#3d2a5c] shadow-[0_8px_20px_-8px_rgba(110,60,40,0.55)] outline-none transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [text-shadow:none] focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-95 motion-reduce:transition-none ${
            visible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
          }`}
        >
          {/* 다음 말로 바뀔 때만 살짝 떠오른다 (첫 문구는 말풍선 등장 효과로 충분) */}
          <span key={n} className={`block ${n > 0 ? "animate-rise motion-reduce:animate-none" : ""}`}>
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
