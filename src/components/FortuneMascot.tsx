"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MASCOT_POSTER, MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { durationMs, frameAt, framePosition } from "@/lib/mascot";

/**
 * 3D 마스코트 "복이" (Blender 렌더 → WebP 스프라이트 시트).
 * - 프레임은 JS가 넘긴다: 멈춤·한 번 재생·완료 콜백을 정확히 제어하고, 화면 밖이거나 탭이 숨겨지면 멈춘다
 * - 시트는 화면 가까이 왔을 때 불러온다. 불러오는 동안·실패하면 포스터(첫 프레임), 포스터도 실패하면 fallback
 * - 동작 줄이기(prefers-reduced-motion 또는 reducedMotion)면 움직이지 않고 포스터만 보여 준다
 * - still 이면 시트를 불러오지 않는다 (목록의 작은 아이콘 등)
 */
export function FortuneMascot({
  state = "idle",
  size = 240,
  loop,
  reducedMotion,
  still = false,
  onAnimationComplete,
  fallback = null,
  label = "마스코트 복이",
  className = "",
}: {
  state?: MascotState;
  size?: number;
  /** 기본값은 동작별 설정 (surprised 는 한 번만) */
  loop?: boolean;
  reducedMotion?: boolean;
  still?: boolean;
  onAnimationComplete?: () => void;
  fallback?: ReactNode;
  label?: string;
  className?: string;
}) {
  const sheet = MASCOT_SHEETS[state];
  const looping = loop ?? sheet.loop;
  const prefersReduced = usePrefersReducedMotion();
  const animate = !still && !(reducedMotion ?? prefersReduced);

  const boxRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onAnimationComplete);
  // IntersectionObserver 가 없는 오래된 브라우저는 바로 불러온다
  const [near, setNear] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  const [loaded, setLoaded] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    doneRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // 화면 근처에 오면 시트를 불러오고, 화면 밖이면 재생을 멈춘다
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !animate || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) setNear(true);
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  useEffect(() => {
    if (!animate || !near) return;
    let alive = true;
    const img = new Image();
    img.onload = () => alive && setLoaded(sheet.src);
    img.onerror = () => alive && setLoaded(null); // 포스터를 그대로 둔다
    img.src = sheet.src;
    return () => {
      alive = false;
    };
  }, [animate, near, sheet.src]);

  const ready = animate && loaded === sheet.src;

  // 동작이 바뀌면 처음부터 재생. 움직이지 않는 경우 반복 없는 동작은 바로 완료 처리
  useEffect(() => {
    if (!animate && !looping) {
      const t = setTimeout(() => doneRef.current?.(), 0);
      return () => clearTimeout(t);
    }
  }, [animate, looping, state]);

  useEffect(() => {
    const el = spriteRef.current;
    if (!ready || !el || !visible) return;
    let raf = 0;
    let start = 0;
    let pausedAt = 0;
    let last = -1;
    let finished = false;
    const tick = (now: number) => {
      if (!start) start = now;
      const f = frameAt(now - start, sheet, looping);
      if (f !== last) {
        el.style.backgroundPosition = framePosition(f, sheet);
        last = f;
      }
      if (!looping && !finished && now - start >= durationMs(sheet)) {
        finished = true;
        doneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        pausedAt = performance.now();
      } else if (!finished) {
        if (pausedAt && start) start += performance.now() - pausedAt;
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready, visible, sheet, looping, state]);

  if (posterFailed && !ready) return <>{fallback}</>;

  return (
    <div ref={boxRef} role="img" aria-label={label} className={`relative select-none ${className}`} style={{ width: size, height: size }}>
      {ready ? (
        <div
          ref={spriteRef}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${sheet.src})`,
            backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
            backgroundPosition: "0% 0%",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 투명 배경 정적 포스터 (최적화 불필요한 작은 WebP)
        <img src={MASCOT_POSTER} alt="" width={size} height={size} draggable={false} className="absolute inset-0 h-full w-full" onError={() => setPosterFailed(true)} />
      )}
    </div>
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
