"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BRAND } from "@/config/brand";
import { StarRabbit } from "./character/StarRabbit";
import { useMascotName } from "./MascotName";
import { FortuneMascot } from "./FortuneMascot";
import { MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { idleReactionFor, introFor, mascotStateFor, nextIdleReactionDelay, outfitFor, resolveSheet, tapReactionFor, type Outfit } from "@/lib/mascot";

const SHEET_NAMES: ReadonlySet<string> = new Set(Object.keys(MASCOT_SHEETS));
/** 의상에 맞는 시트 이름 */
const sheetFor = (outfit: Outfit, state: string) => resolveSheet(outfit, state, SHEET_NAMES) as MascotState;
/** 반응으로 쓸 수 있는지 (한 번 재생 동작이어야 끝나고 바탕 동작으로 돌아온다) */
const isOneShot = (outfit: Outfit, state: string) => !MASCOT_SHEETS[sheetFor(outfit, state)].loop;
import {
  ACTION_EXPRESSION,
  ACTION_KEYFRAMES,
  DIZZY_TAPS,
  DIZZY_WINDOW_MS,
  baseLook,
  linesFor,
  nextIdleDelay,
  pickIdleBehavior,
  pickTapReaction,
  type Action,
  type Expression,
  type Mood,
  type Scene,
} from "@/lib/character";

/** 눈을 뜨고 있는 표정에서만 깜빡인다 (웃는 눈·감은 눈은 그대로) */
const BLINKABLE: ReadonlySet<Expression> = new Set(["neutral", "thinking", "worried", "surprised"]);
const BUBBLE_MS = 2400;

/**
 * 화면 가운데에 놓이는 대표 캐릭터 무대.
 * - pose: 장면 (기본·점치는 중·결과·타로·별자리)
 * - mood: 운세 결과의 분위기. 주면 표정·반복 동작이 결과에 맞게 바뀐다
 * - interactive: 터치하면 반응하고 말풍선을 띄운다
 * 가만히 있으면 눈을 깜빡이고, 두리번거리고, 오래 두면 하품한다.
 * 캐릭터 이미지는 src/config/brand.ts 에서 표정별로 지정한다. 지정 전에는 임시 캐릭터를 그린다.
 */
export function CharacterStage({
  pose = "default",
  mood = null,
  size: baseSize = 240,
  orbs = false,
  interactive = baseSize >= 120,
  expression: fixedExpression,
  character = BRAND.character.renderer,
  zoom = BRAND.character.mascotZoom,
  quietIntro = false,
  className = "",
}: {
  /** 등장 인사 말풍선을 띄우지 않는다 (화면이 따로 말풍선을 보여 줄 때, 지금은 홈). 등장 동작은 그대로 */
  quietIntro?: boolean;
  /** 3D 마스코트 확대 배율 (기본값은 brand.ts). 무대 전체(레이아웃 크기 포함)를 키워 주변과 겹치지 않는다 */
  zoom?: number;
  /** 캐릭터 종류: 3D 마스코트 별이(기본) 또는 SVG 별토끼 */
  character?: "mascot3d" | "svg";
  pose?: Scene;
  mood?: Mood | null;
  /** 표정을 고정한다 (캐릭터 갤러리용) */
  expression?: Expression;
  size?: number;
  orbs?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const size = character === "mascot3d" ? Math.round(baseSize * zoom) : baseSize;
  const mascotName = useMascotName();
  const base = baseLook(pose, mood);
  const reduced = useReducedMotion();
  const [temp, setTemp] = useState<{ expression: Expression; token: number } | null>(null);
  const [gaze, setGaze] = useState<-1 | 0 | 1>(0);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [reaction, setReaction] = useState<{ state: MascotState; id: number } | null>(null);
  const is3d = character === "mascot3d";
  const outfit = outfitFor(pose);
  const expression = temp?.expression ?? fixedExpression ?? base.expression;

  const actorRef = useRef<HTMLDivElement>(null);
  const exprRef = useRef(expression);
  const lastTouch = useRef(0);
  const taps = useRef<number[]>([]);
  const prevLine = useRef<string | null>(null);
  const busyUntil = useRef(0);
  const token = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    exprRef.current = expression;
  }, [expression]);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);

  /** 잠깐 다른 표정을 지었다가 원래 표정으로 돌아온다 */
  const showExpression = useCallback(
    (e: Expression, ms: number) => {
      const t = ++token.current;
      setTemp({ expression: e, token: t });
      later(() => setTemp((cur) => (cur?.token === t ? null : cur)), ms);
    },
    [later],
  );

  const play = useCallback(
    (action: Action, e?: Expression) => {
      const spec = ACTION_KEYFRAMES[action];
      busyUntil.current = performance.now() + spec.duration;
      if (e) showExpression(e, spec.duration);
      const el = actorRef.current;
      if (reduced || !el || typeof el.animate !== "function") return;
      el.style.transformOrigin = spec.origin ?? "50% 90%";
      el.animate(spec.frames, { duration: spec.duration, easing: "ease-in-out" });
    },
    [reduced, showExpression],
  );

  // 가만히 있을 때 동작: 화면이 보일 때만, 다른 몸짓 중이 아닐 때만
  useEffect(() => {
    if (is3d) return; // 3D 마스코트는 대기 동작(깜빡임·숨쉬기)이 영상에 들어 있다
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    lastTouch.current = Date.now();
    const tick = () => {
      if (!alive) return;
      if (!document.hidden && performance.now() > busyUntil.current) {
        const b = pickIdleBehavior(pose, Date.now() - lastTouch.current, Math.random);
        if (b.kind === "blink" || reduced) {
          if (BLINKABLE.has(exprRef.current)) showExpression("blink", 140);
        } else if (b.kind === "look") {
          setGaze(b.dir);
          busyUntil.current = performance.now() + 1200;
          later(() => setGaze(0), 1200);
        } else {
          play(b.action, ACTION_EXPRESSION[b.action]);
          if (b.action === "yawn") lastTouch.current = Date.now();
        }
      }
      t = setTimeout(tick, nextIdleDelay(Math.random));
    };
    t = setTimeout(tick, nextIdleDelay(Math.random));
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [is3d, pose, reduced, play, showExpression, later]);

  // 3D 마스코트: 화면에 들어오면 한 번 인사·결과 소개, 이후 가끔(9~16초) 손 흔들기·끄덕·하품
  const introRaw = is3d && size >= 120 ? introFor(pose, mood) : null;
  const intro = introRaw && isOneShot(outfit, introRaw) ? introRaw : null;
  useEffect(() => {
    if (!is3d || size < 120) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    lastTouch.current = Date.now();
    if (intro) {
      t = setTimeout(() => {
        if (!alive) return;
        const id = Date.now();
        setReaction({ state: intro, id });
        if (interactive && !quietIntro && (mood || pose === "default")) {
          const pool = linesFor(mood ?? pose);
          setBubble({ text: pool[Math.floor(Math.random() * pool.length)], id });
          later(() => setBubble((b) => (b?.id === id ? null : b)), BUBBLE_MS);
        }
      }, 450);
    }
    const loop = () => {
      t = setTimeout(() => {
        if (!alive) return;
        if (!document.hidden) {
          const st = idleReactionFor(Date.now() - lastTouch.current, Math.random);
          if (st && isOneShot(outfit, st)) {
            setReaction((cur) => cur ?? { state: st, id: Date.now() });
            if (st === "yawn") lastTouch.current = Date.now();
          }
        }
        loop();
      }, nextIdleReactionDelay(Math.random));
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [is3d, size, intro, interactive, quietIntro, mood, pose, outfit, later]);

  function onTap() {
    const now = Date.now();
    lastTouch.current = now;
    taps.current = [...taps.current.filter((x) => now - x < DIZZY_WINDOW_MS), now];
    const recent = taps.current.length;
    const r = pickTapReaction(pose, mood, recent, prevLine.current, Math.random);
    if (recent >= DIZZY_TAPS) taps.current = [];
    prevLine.current = r.line;
    setGaze(0);
    if (is3d) {
      // 반응 동작은 휴식 자세로 끝나 바탕 동작으로 자연스럽게 돌아간다 (FortuneMascot 이 완료를 알림)
      const st = tapReactionFor(recent, DIZZY_TAPS, Math.random);
      if (isOneShot(outfit, st)) setReaction({ state: st, id: now });
    } else {
      play(r.action, r.expression);
    }
    setBubble({ text: r.line, id: now });
    later(() => setBubble((b) => (b?.id === now ? null : b)), BUBBLE_MS);
    try {
      navigator.vibrate?.(8); // Android만 지원. iOS는 무시된다
    } catch {
      /* 진동 미지원 */
    }
  }

  const svgFigure = BRAND.character.images.neutral ? (
    <ImageCharacter expression={expression} gaze={gaze} />
  ) : (
    <StarRabbit expression={expression} gaze={gaze} scene={pose} mood={mood} label={`마스코트 ${mascotName}`} />
  );
  const figure = is3d ? (
    <FortuneMascot
      state={sheetFor(outfit, reaction?.state ?? mascotStateFor(pose, mood))}
      playId={reaction?.id ?? 0}
      size={size}
      still={size < 120}
      preload={(interactive ? ["wave", "nod", "surprised", ...(intro ? [intro] : [])] : intro ? [intro] : []).map((st) => sheetFor(outfit, st))}
      label={`마스코트 ${mascotName}`}
      onAnimationComplete={(st) => setReaction((x) => (x && sheetFor(outfit, x.state) === st ? null : x))}
      fallback={svgFigure}
    />
  ) : (
    svgFigure
  );
  // 몸 전체 캐릭터는 무대를 넓게 쓴다 (3D 렌더는 여백이 포함돼 있어 무대 전체)
  const box = is3d ? size : size * 0.86;
  const showBubble = interactive && size >= 140 && bubble;

  return (
    <div className={`relative mx-auto flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* 바닥 글로우 (SVG 별토끼만. 3D 별이는 움직이는 흐림 효과가 무거워 쓰지 않음) */}
      {!is3d && <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(177,140,255,0.45),transparent_70%)] blur-2xl animate-glow" />}
      {orbs && <Orbs size={size} />}
      {showBubble && (
        <div key={bubble.id} className="char-bubble bubble-soft pointer-events-none absolute left-1/2 top-0 z-10 w-max max-w-[min(240px,80vw)] rounded-[18px] px-3.5 py-2 text-center text-[14px] font-semibold leading-snug">
          {bubble.text}
          <span className="absolute -bottom-[6.5px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[rgba(124,92,201,0.18)] bg-[#f7f4fc]" aria-hidden />
        </div>
      )}
      {/* 그림자 필터는 움직이는 스프라이트에 걸면 매 프레임 다시 그려져 무거우므로 SVG 별토끼에만 */}
      <div className={`relative ${is3d ? "" : "animate-float drop-shadow-[0_14px_28px_rgba(120,80,220,0.45)]"}`} style={{ width: box, height: box }}>
        {is3d && <div className="absolute bottom-[5%] left-1/2 h-[7%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[#3a1f3a]/25" aria-hidden />}
        <div className={`relative h-full w-full ${is3d ? "" : `char-loop-${base.loop}`}`}>
          <div ref={actorRef} className="h-full w-full">
            {interactive ? (
              <button
                type="button"
                onClick={onTap}
                aria-label={`${mascotName} 쓰다듬기`}
                className="block h-full w-full cursor-pointer touch-manipulation select-none rounded-full outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-accent/70"
              >
                {figure}
              </button>
            ) : (
              figure
            )}
          </div>
        </div>
      </div>
      {interactive && (
        <span className="sr-only" aria-live="polite">
          {bubble?.text ?? ""}
        </span>
      )}
    </div>
  );
}

function Orbs({ size }: { size: number }) {
  const orbCount = 5;
  return (
    <>
      {/* 고리 */}
      <div className="absolute inset-[8%] rounded-full border-[6px] border-white/25 shadow-[0_0_30px_rgba(180,160,255,0.35)]" />
      {/* 공전하는 빛 구슬 */}
      <div className="absolute inset-0 animate-orbit">
        {Array.from({ length: orbCount }, (_, i) => {
          const a = (i / orbCount) * Math.PI * 2 - Math.PI / 2;
          const r = size * 0.46;
          return (
            <span
              key={i}
              className="absolute h-[11%] w-[11%] rounded-full bg-white shadow-[0_0_18px_6px_rgba(200,170,255,0.75)]"
              style={{ left: `calc(50% + ${Math.cos(a) * r}px - 5.5%)`, top: `calc(50% + ${Math.sin(a) * r}px - 5.5%)` }}
            />
          );
        })}
      </div>
    </>
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
/** 기기 설정에서 "동작 줄이기"를 켠 사용자에게는 몸짓 대신 표정만 바꾼다 */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** 표정별 이미지. 모두 미리 불러 두고 보이는 것만 바꿔서 표정이 바뀔 때 깜빡이지 않게 한다 */
function ImageCharacter({ expression, gaze }: { expression: Expression; gaze: number }) {
  const images = BRAND.character.images;
  const src = images[expression] ?? images.neutral!;
  const all = Array.from(new Set(Object.values(images).filter(Boolean) as string[]));
  return (
    <div className="relative h-full w-full transition-transform duration-500" style={{ transform: `rotate(${gaze * 5}deg)` }}>
      {all.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element -- 사용자가 교체하는 정적 캐릭터 이미지
        <img
          key={s}
          src={s}
          alt={s === src ? BRAND.character.alt : ""}
          hidden={s !== src}
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_30px_rgba(120,80,220,0.55)]"
        />
      ))}
    </div>
  );
}
