"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MyButton } from "@/components/app/HomeButton";
import { FitSize } from "@/components/app/Screen";
import { CharacterStage } from "@/components/Character";
import { useMascotName } from "@/components/MascotName";
import type { Scene } from "@/lib/character";
import { dayTalk, daySubline, kstDateKey, type HomeDay } from "@/lib/home-day";
import { pickGreeting } from "@/lib/home-greeting";
import { menuLine, type HomeMenuItem } from "@/lib/home-menu";
import { aboveHead, outfitFor } from "@/lib/mascot";

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
 * 홈 장면: 위쪽 오늘 줄(날짜·음력·일진) + MY 버튼 + 남는 높이에 맞춘 마스코트 + 머리(모자) 바로 위 말풍선.
 * 말풍선: 처음엔 시간대·요일 인사, 메뉴를 넘기면 그 메뉴의 말, 오늘 줄을 누르면 일진·달 이야기, 이름을 지어 주면 고맙다는 말(special). 누르면 다음 말.
 * 마스코트는 고른 메뉴의 의상(pose)을 입는다.
 */
export function HomeGreeting({
  name,
  days,
  pose,
  menu,
  viewedToday,
  special,
}: {
  name: string;
  /** 오늘·내일 오늘 줄 값 (서버 계산) */
  days: HomeDay[];
  pose: Scene;
  menu: HomeMenuItem | null;
  viewedToday: boolean;
  special: string | null;
}) {
  const router = useRouter();
  const mascot = useMascotName();
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, () => null);
  const now = minute === null ? null : new Date(minute * 60_000);
  // 오늘 줄: 서버 렌더·하이드레이션 전에는 서버의 오늘, 그 뒤로는 지금 한국 날짜 (자정이 지나면 내일 값으로)
  const dayKey = minute === null ? days[0]?.date : kstDateKey(minute * 60_000);
  const day = days.find((d) => d.date === dayKey) ?? null;
  const refreshed = useRef<string | undefined>(undefined);
  useEffect(() => {
    // 받아 둔 날짜가 다 지났으면(이틀 넘게 켜 둠) 새로 받는다. 같은 날짜로 두 번 부르지 않는다
    if (minute === null || day || refreshed.current === dayKey) return;
    refreshed.current = dayKey;
    router.refresh();
  }, [minute, day, dayKey, router]);
  // 오늘 줄을 누르면 일진·달 이야기를 한다. 메뉴를 넘기면 다시 메뉴 이야기로
  const [dayAsk, setDayAsk] = useState<{ menu: string | null; date: string } | null>(null);
  const talk = day ? dayTalk(day) : [];
  const dayActive = !!day && talk.length > 0 && dayAsk?.date === day.date && dayAsk.menu === (menu?.id ?? null);
  // 말 차례는 말할 거리(인사·메뉴·오늘 이야기·특별한 말)가 바뀌면 처음부터
  const topic = special ? `special:${special}` : dayActive ? `day:${day.date}` : menu ? `menu:${menu.id}` : "greet";
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

  const line = special ?? (dayActive ? talk[n % talk.length] : menu ? menuLine(menu, n, viewedToday) : now ? pickGreeting(now, n) : null);
  const askDay = () => {
    if (!day) return;
    clearTimeout(hideTimer.current);
    setHiddenUntilTap(false);
    if (dayActive) next();
    else setDayAsk({ menu: menu?.id ?? null, date: day.date });
  };
  // 메뉴를 넘기거나 특별한 말이 생기면 기다리지 않고 바로 말한다
  const visible = (shown || topic !== "greet") && !hiddenUntilTap && line;

  return (
    // 날짜·인사 제목은 없앴다(2026-10-24 사용자 결정). 위는 MY 버튼, 나머지는 마스코트와 머리 위 말풍선
    <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3.25rem,8dvh,4.5rem)] text-center">
      <h1 className="sr-only">{name}님의 홈</h1>
      {/* 밤하늘 배경(scene-dark)에서는 어두운 유리 버튼 */}
      {day && (
        // 오늘 줄: 왼쪽 위(MY 버튼 맞은편). 누르면 마스코트가 오늘 일진·달 이야기를 한다
        <button
          type="button"
          onClick={askDay}
          aria-label={`${day.label}, ${daySubline(day)}. ${mascot}에게 오늘 이야기 듣기`}
          className="absolute left-0 top-2 z-20 flex h-10 max-w-[calc(100%-3.5rem)] items-center gap-2 rounded-full pr-2 text-left outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/70 motion-reduce:transition-none"
        >
          {day.lunar && <MoonPhase day={day.lunar.day} />}
          <span className="flex min-w-0 flex-col [text-shadow:0_1px_6px_rgba(10,6,40,0.65)]">
            <span className="text-[14px] font-bold leading-tight text-white">{day.label}</span>
            <span className="mt-0.5 truncate text-[11.5px] font-medium leading-tight text-white/75">{daySubline(day)}</span>
          </span>
        </button>
      )}
      <MyButton className="[.scene-dark_&]:bg-white/12 [.scene-dark_&]:text-white [.scene-dark_&]:ring-1 [.scene-dark_&]:ring-white/25" />

      {/* 말풍선 높이(4.4rem)는 늘 잡아 두어 문구가 떠도 마스코트 크기가 바뀌지 않게 한다 (패딩은 크기 계산에서 빠짐).
          마스코트는 뒤 배경이 보이게 작게: 최대 230, 낮은 화면일수록 더 작게 (2026-10-25 사용자 요청) */}
      <FitSize min={90} max={230} className="max-h-[calc(100dvh-428px+4.4rem)] w-full items-end pt-[4.4rem]">
        {(size) => (
          <div className="relative">
            {/* 말풍선은 마스코트 머리(의상 모자) 바로 위에 붙는다. 꼬리(아래 가운데)에서 톡 튀어나오듯 커지며 나타난다 */}
            <button
              type="button"
              onClick={next}
              aria-label={`${mascot}의 다음 말 듣기`}
              tabIndex={visible ? 0 : -1}
              style={{ bottom: aboveHead(outfitFor(pose), size, 8) }}
              // 은은한 흰 말풍선(앱 공용 bubble-soft). 동작 줄이기 설정이면 바로 보인다
              className={`bubble-soft absolute left-1/2 z-10 w-max max-w-[min(290px,calc(100vw-3rem))] -translate-x-1/2 origin-bottom rounded-[20px] px-4 py-2.5 text-[clamp(13px,2.1dvh,15px)] font-semibold leading-snug outline-none transition-[opacity,scale,bottom] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [text-shadow:none] focus-visible:ring-2 focus-visible:ring-accent/70 active:scale-95 motion-reduce:transition-none ${
                visible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
              }`}
            >
              {/* 말이 바뀔 때마다 살짝 떠오른다 */}
              <span key={`${topic}:${n}`} className="block whitespace-pre-line animate-rise motion-reduce:animate-none">
                {line}
              </span>
              <span className="absolute -bottom-[6.5px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[rgba(124,92,201,0.18)] bg-[#f7f4fc]" aria-hidden />
            </button>
            {/* 마스코트를 누르면 마스코트 말풍선과 겹치지 않게 홈 말풍선을 잠깐 숨긴다.
                등장 인사 말풍선은 이 화면의 말풍선이 대신한다(quietIntro) */}
            <div
              onClickCapture={() => {
                setHiddenUntilTap(true);
                clearTimeout(hideTimer.current);
                hideTimer.current = setTimeout(() => {
                  setHiddenUntilTap(false);
                  setTurn((t) => ({ topic, n: (t.topic === topic ? t.n : 0) + 1 }));
                }, TAP_HIDE_MS);
              }}
            >
              <CharacterStage size={size} pose={pose} quietIntro />
            </div>
          </div>
        )}
      </FitSize>
      <span className="sr-only" aria-live="polite">
        {visible ? line : ""}
      </span>
    </div>
  );
}

/**
 * 음력 날짜로 그린 오늘 밤 달 모양 (차오를 때는 오른쪽, 기울 때는 왼쪽이 밝다).
 * 밝은 쪽 가장자리 반원 + 명암 경계(가로 반지름 r·|cos 2πp| 인 반타원)로 그린다
 */
function MoonPhase({ day }: { day: number }) {
  const r = 8;
  const p = Math.min(0.999, Math.max(0, (day - 1) / 29.53));
  const waxing = p < 0.5;
  const rx = Math.round(r * Math.abs(Math.cos(2 * Math.PI * p)) * 100) / 100;
  // 초승·그믐(밝은 쪽이 반보다 작음)이면 경계가 밝은 쪽으로, 상현~하현 사이(반보다 큼)면 어두운 쪽으로 불룩하다
  const crescent = p < 0.25 || p > 0.75;
  const outer = waxing ? 1 : 0;
  const inner = waxing === crescent ? 0 : 1;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/25" aria-hidden>
      <svg width="22" height="22" viewBox="-11 -11 22 22">
        <circle r={r + 2.5} fill="#fff3c4" opacity=".12" />
        <circle r={r} fill="#2c2760" stroke="#fff3c4" strokeOpacity=".35" strokeWidth=".6" />
        <path d={`M0 ${-r}A${r} ${r} 0 0 ${outer} 0 ${r}A${rx} ${r} 0 0 ${inner} 0 ${-r}Z`} fill="#fff3c4" />
      </svg>
    </span>
  );
}
