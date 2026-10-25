"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MyButton } from "@/components/app/HomeButton";
import { FitCharacter } from "@/components/app/Screen";
import { useMascotName } from "@/components/MascotName";
import type { Scene } from "@/lib/character";
import { pickGreeting } from "@/lib/home-greeting";
import { menuLine, type HomeMenuItem } from "@/lib/home-menu";

/** 들어온 뒤 마스코트가 손을 흔드는 동안 잠깐 두었다가 말풍선을 띄운다 */
const FIRST_BUBBLE_DELAY_MS = 900;
/** 마스코트를 누르면 마스코트 자체 말풍선이 뜨므로 그동안 홈 말풍선을 숨긴다 (CharacterStage BUBBLE_MS) */
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

/**
 * 홈 장면: MY 버튼 + 마스코트 말풍선 + 남는 높이에 맞춘 마스코트.
 * 말풍선: 처음엔 시간대·요일 인사, 메뉴를 넘기면 그 메뉴의 말, 이름을 지어 주면 고맙다는 말(special). 누르면 다음 말.
 * 마스코트는 고른 메뉴의 의상(pose)을 입는다.
 */
export function HomeGreeting({ name, pose, menu, viewedToday, special }: { name: string; pose: Scene; menu: HomeMenuItem | null; viewedToday: boolean; special: string | null }) {
  const mascot = useMascotName();
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);
  // 말 차례는 말할 거리(인사·메뉴·특별한 말)가 바뀌면 처음부터
  const topic = special ? `special:${special}` : menu ? `menu:${menu.id}` : "greet";
  const [turn, setTurn] = useState({ topic, n: 0 });
  const n = turn.topic === topic ? turn.n : 0;
  const next = () => setTurn({ topic, n: n + 1 });
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

  const line = special ?? (menu ? menuLine(menu, n, viewedToday) : now ? pickGreeting(now, n) : null);
  // 메뉴를 넘기거나 특별한 말이 생기면 기다리지 않고 바로 말한다
  const visible = (shown || topic !== "greet") && !hiddenUntilTap && line;

  return (
    // 날짜·인사 제목은 없앴다(2026-10-24 사용자 결정). 위는 MY 버튼, 그 아래 말풍선, 나머지는 마스코트
    <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3.25rem,8dvh,4.5rem)] text-center">
      <h1 className="sr-only">{name}님의 홈</h1>
      {/* 밤하늘 배경(scene-dark)에서는 어두운 유리 버튼 */}
      <MyButton className="[.scene-dark_&]:bg-white/12 [.scene-dark_&]:text-white [.scene-dark_&]:ring-1 [.scene-dark_&]:ring-white/25" />

      {/* 말풍선 자리는 늘 잡아 두어 문구가 떠도 마스코트 크기가 바뀌지 않게 한다 */}
      <div className="flex h-[4.4rem] w-full shrink-0 items-end justify-center">
        <button
          type="button"
          onClick={next}
          aria-label={`${mascot}의 다음 말 듣기`}
          tabIndex={visible ? 0 : -1}
          // 은은한 흰 말풍선(앱 공용 bubble-soft). 꼬리(아래 가운데)에서 톡 튀어나오듯 커지며 나타난다. 동작 줄이기 설정이면 바로 보인다
          className={`bubble-soft relative max-w-[min(290px,88%)] origin-bottom rounded-[20px] px-4 py-2.5 text-[clamp(13px,2.1dvh,15px)] font-semibold leading-snug outline-none transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [text-shadow:none] focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-95 motion-reduce:transition-none ${
            visible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
          }`}
        >
          {/* 말이 바뀔 때마다 살짝 떠오른다 */}
          <span key={`${topic}:${n}`} className="block whitespace-pre-line animate-rise motion-reduce:animate-none">
            {line}
          </span>
          <span className="absolute -bottom-[6.5px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[rgba(124,92,201,0.18)] bg-[#f7f4fc]" aria-hidden />
        </button>
      </div>

      {/* 마스코트를 누르면 마스코트 말풍선과 겹치지 않게 홈 말풍선을 잠깐 숨긴다 */}
      <div
        className="flex min-h-0 w-full flex-1 flex-col justify-end"
        onClickCapture={() => {
          setHiddenUntilTap(true);
          clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => {
            setHiddenUntilTap(false);
            setTurn((t) => ({ topic, n: (t.topic === topic ? t.n : 0) + 1 }));
          }, TAP_HIDE_MS);
        }}
      >
        {/* 마스코트는 뒤의 수정구가 보이게 작게: 최대 230, 낮은 화면일수록 더 작게 (2026-10-25 사용자 요청).
            등장 인사 말풍선은 이 화면의 말풍선이 대신한다(quietIntro) */}
        <FitCharacter pose={pose} quietIntro min={90} max={230} className="max-h-[calc(100dvh-428px)] w-full items-end" />
      </div>
      <span className="sr-only" aria-live="polite">
        {visible ? line : ""}
      </span>
    </div>
  );
}
