"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MASCOT_POSTERS, MASCOT_SHEETS, type MascotSheet, type MascotState } from "@/config/mascot-assets";
import { durationMs, frameAt, framePosition } from "@/lib/mascot";

const FADE_MS = 140;

/**
 * 시트 이미지. 여러 마스코트가 같은 이미지를 공유한다.
 * - prefetchSheet: 내려받기만 (디코딩 안 함). 미리 불러올 시트가 메모리를 차지하지 않게 — 시트 한 장 디코딩 ≈ 수십 MB
 * - loadSheet: 화면에 올리기 직전에 내려받기 + 디코딩. 디코딩이 끝나야 바꿔 끼울 때 빈 화면이 안 생긴다
 */
const fetched = new Map<string, Promise<boolean>>();
const decoded = new Map<string, Promise<boolean>>();
function prefetchSheet(src: string) {
  let p = fetched.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        fetched.delete(src); // 다음에 다시 시도
        resolve(false);
      };
      img.src = src;
    });
    fetched.set(src, p);
  }
  return p;
}
function loadSheet(src: string) {
  let p = decoded.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (typeof img.decode === "function") img.decode().then(() => resolve(true), () => resolve(true));
        else resolve(true);
      };
      img.onerror = () => {
        decoded.delete(src);
        resolve(false);
      };
      img.src = src;
    });
    decoded.set(src, p);
    // 디코딩한 이미지는 오래 붙잡지 않는다 (같은 시트를 다시 쓰면 브라우저 캐시에서 빠르게 다시 디코딩)
    setTimeout(() => decoded.delete(src), 30_000);
  }
  return p;
}

type Layer = { state: MascotState; playId: number; key: number };

/**
 * 3D 마스코트 "복이" (Blender 렌더 → WebP 스프라이트 시트, docs/MASCOT.md).
 * - 동작이 바뀌면 새 시트를 불러온 뒤, 이전 층은 불투명하게 둔 채 새 층만 0.14초 동안 나타나게 한다.
 *   (두 층을 동시에 반투명하게 겹치면 전체가 흐려 보이므로 이전 층은 흐리게 하지 않는다)
 * - 한 번 재생 동작(wave·nod·surprised·reveal·celebrate·yawn)은 마지막 프레임(휴식 자세)에서 멈추고 onAnimationComplete 를 부른다
 * - 같은 동작을 다시 재생하려면 playId 를 바꾼다
 * - 시트는 화면 가까이 왔을 때 불러오고, 화면 밖·탭 숨김이면 멈춘다. 불러오기 전·실패 시 포스터, 포스터도 실패하면 fallback
 * - 동작 줄이기(prefers-reduced-motion 또는 reducedMotion)·still 이면 포스터만 보여 준다
 */
export function FortuneMascot({
  state = "idle",
  playId = 0,
  size = 240,
  loop,
  reducedMotion,
  still = false,
  preload = [],
  onAnimationComplete,
  fallback = null,
  label = "마스코트 복이",
  zoom = 1,
  className = "",
}: {
  state?: MascotState;
  playId?: number;
  size?: number;
  /** 기본값은 동작별 설정 */
  loop?: boolean;
  reducedMotion?: boolean;
  still?: boolean;
  /** 곧 쓸 동작 시트를 미리 불러 둔다 (반응이 늦게 시작되지 않게) */
  preload?: MascotState[];
  onAnimationComplete?: (state: MascotState) => void;
  fallback?: ReactNode;
  label?: string;
  /**
   * 캐릭터 확대 배율. 상자(size×size)는 그대로 두고 그림만 키운다 (바닥 기준으로 위·옆으로 커짐).
   * 1 = 캐릭터 영역 높이가 size 와 같음
   */
  zoom?: number;
  className?: string;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const animate = !still && !(reducedMotion ?? prefersReduced);

  const boxRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onAnimationComplete);
  const keyRef = useRef(0);
  const shownRef = useRef<Layer | null>(null);
  // IntersectionObserver 가 없는 오래된 브라우저는 바로 불러온다
  const [near, setNear] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState<Layer | null>(null);
  const [leaving, setLeaving] = useState<Layer | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    doneRef.current = onAnimationComplete;
  }, [onAnimationComplete]);
  /** 보이는 층의 한 번 재생 동작이 끝났을 때 (재생 중 호출되므로 ref 를 읽어도 된다) */
  const onShownDone = useCallback(() => {
    const st = shownRef.current?.state;
    if (st) doneRef.current?.(st);
  }, []);

  // 화면 근처에 오면 불러오기 시작, 화면 밖이면 재생 정지
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !animate || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    // 관찰 결과가 오지 않는 환경(일부 웹뷰 등)에서도 결국 불러오도록
    const t = setTimeout(() => setNear(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [animate]);

  // 요청된 동작의 시트가 준비되면 바꿔 끼운다 (이전 층은 잠깐 남겨 겹쳐 사라지게)
  useEffect(() => {
    if (!animate || !near) return;
    let alive = true;
    void loadSheet(MASCOT_SHEETS[state].src).then((ok) => {
      if (!alive) return;
      if (!ok) {
        // 불러오지 못한 반응 동작은 바로 끝난 것으로 처리 (바탕 동작으로 돌아가게)
        if (!(loop ?? MASCOT_SHEETS[state].loop)) doneRef.current?.(state);
        return;
      }
      const cur = shownRef.current;
      if (cur && cur.state === state && cur.playId === playId) return;
      const next = { state, playId, key: ++keyRef.current };
      shownRef.current = next;
      setLeaving(cur);
      setShown(next);
    });
    return () => {
      alive = false;
    };
  }, [animate, near, state, playId, loop]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), FADE_MS + 40);
    return () => clearTimeout(t);
  }, [leaving]);

  // 곧 쓸 시트 미리 불러오기 (바탕 동작을 먼저 띄운 뒤)
  const preloadKey = preload.join(",");
  useEffect(() => {
    if (!animate || !near || !shown || !preloadKey) return;
    const t = setTimeout(() => preloadKey.split(",").forEach((s) => void prefetchSheet(MASCOT_SHEETS[s as MascotState].src)), 600);
    return () => clearTimeout(t);
  }, [animate, near, shown, preloadKey]);

  // 움직이지 않는 경우: 반응 동작은 바로 완료 처리
  useEffect(() => {
    if (animate || (loop ?? MASCOT_SHEETS[state].loop)) return;
    const t = setTimeout(() => doneRef.current?.(state), 0);
    return () => clearTimeout(t);
  }, [animate, loop, state, playId]);

  if (posterFailed && !shown) return <>{fallback}</>;
  const cur = MASCOT_SHEETS[state];
  const poster = MASCOT_POSTERS[cur.outfit] ?? MASCOT_POSTERS.default;
  const frameH = size * zoom;
  const frameW = (frameH * cur.frameW) / cur.frameH;

  return (
    <div ref={boxRef} role="img" aria-label={label} className={`relative select-none ${className}`} style={{ width: size, height: size }}>
      {/* 시트 칸은 여백을 잘라 내 세로로 길다. 높이 = size×zoom, 가로 가운데·바닥 맞춤 */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2" style={{ height: frameH, width: frameW }}>
      {(!animate || !shown) && (
        // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 정적 포스터 (작은 WebP)
        <img src={poster} alt="" draggable={false} className="absolute inset-0 h-full w-full" onError={() => setPosterFailed(true)} />
      )}
      {/* 같은 목록·같은 key 로 그려야 나가는 층이 다시 만들어지지 않고 마지막 프레임을 그대로 유지한다 */}
      {animate &&
        [leaving, shown].map((l) =>
          l ? (
            <Sprite
              key={l.key}
              sheet={MASCOT_SHEETS[l.state]}
              loop={loop ?? MASCOT_SHEETS[l.state].loop}
              playing={l === shown && visible}
              fade={l === shown && l.key > 1 ? "in" : null}
              onDone={l === shown ? onShownDone : undefined}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}

/** 시트 한 장 재생. 프레임은 requestAnimationFrame 으로 직접 넘긴다 (리렌더 없음) */
function Sprite({ sheet, loop, playing, fade, onDone }: { sheet: MascotSheet; loop: boolean; playing: boolean; fade: "in" | null; onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  const clock = useRef({ start: 0, pausedAt: 0, finished: false });

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !fade || typeof el.animate !== "function") return;
    const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out" });
    return () => a.cancel();
  }, [fade]);

  useEffect(() => {
    const el = ref.current;
    const c = clock.current;
    if (!el || !playing || c.finished) return;
    let raf = 0;
    let last = -1;
    const now0 = performance.now();
    if (!c.start) c.start = now0;
    else if (c.pausedAt) c.start += now0 - c.pausedAt; // 멈췄던 시간만큼 미룬다
    c.pausedAt = 0;
    const tick = (now: number) => {
      const f = frameAt(now - c.start, sheet, loop);
      if (f !== last) {
        el.style.backgroundPosition = framePosition(f, sheet);
        last = f;
      }
      if (!loop && now - c.start >= durationMs(sheet)) {
        c.finished = true;
        doneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        c.pausedAt = performance.now();
      } else if (!c.finished) {
        if (c.pausedAt) c.start += performance.now() - c.pausedAt;
        c.pausedAt = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      c.pausedAt = performance.now();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [playing, sheet, loop]);

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${sheet.src})`,
        backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
        backgroundPosition: "0% 0%",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
