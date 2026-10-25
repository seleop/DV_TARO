"use client";

import { usePathname } from "next/navigation";
import { Children, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { SCENE_INK, isBackdropKind, sceneForPath, type BackdropKind } from "@/lib/scene";
import { CharacterStage } from "../Character";
import { SceneArt } from "./SceneArt";
import { SceneBackdrop } from "../backdrops";

/**
 * 스크롤 없는 화면 틀: 머리(header) · 본문(남는 높이만 사용) · 하단 버튼(footer).
 * 본문은 화면 높이를 넘지 않게 만들고, 내용이 길면 Pager로 나눠 좌우로 넘긴다.
 * scroll=true는 사주 설명처럼 길게 읽는 화면에서만 쓴다.
 *
 * scene 을 주면 "장면 + 시트" 화면이 된다 (레퍼런스: 위는 캐릭터가 서 있는 일러스트, 아래는 조작 시트).
 *  - 장면: 경로별 일러스트(SceneArt) 위에 header·scene 을 그린다. 남는 높이를 모두 쓰고, 별이는 바닥에 맞춘다
 *  - 시트: 크림색 둥근 판. children·footer 를 담고, 장면 아래를 살짝 덮어 둘이 이어져 보이게 한다
 *  - 기능별 밤 장면(홈·타로·오늘의 운세·사주·별자리, src/components/backdrops)은 밝은 글씨 + 어두운 유리 시트.
 *    오늘의 운세(dawn)는 sceneWalking=true면 마스코트 걸음에 맞춰 배경이 흐른다
 */
export function Screen({
  header,
  footer,
  children,
  scene,
  scroll = false,
  sceneWalking = false,
  backdrop,
  className = "",
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** 장면 영역 내용 (제목·별이). 주면 장면 + 시트 화면 */
  scene?: ReactNode;
  scroll?: boolean;
  /** 장면 배경이 걷는 중처럼 흐른다 (움직이는 장면에서만, 지금은 오늘의 운세 별빛 오솔길) */
  sceneWalking?: boolean;
  /** 장면 배경을 직접 고른다 (홈: 고른 메뉴 카드의 배경). 없으면 경로로 정한다 */
  backdrop?: BackdropKind;
  className?: string;
}) {
  const path = sceneForPath(usePathname());
  const kind = backdrop && path !== "plain" ? backdrop : path;
  if (scene !== undefined && kind !== "plain") {
    // 기능별 밤 장면은 어두운 보랏빛 유리 시트
    const dark = isBackdropKind(kind);
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`relative -mx-5 -mt-[env(safe-area-inset-top)] flex min-h-0 flex-1 flex-col px-5 pt-[env(safe-area-inset-top)] ${SCENE_INK[kind]}`}>
          {isBackdropKind(kind) ? (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <SceneBackdrop kind={kind} walking={sceneWalking} />
            </div>
          ) : (
            <SceneArt kind={kind} className="absolute inset-0 h-full w-full" />
          )}
          <div className="relative flex min-h-0 flex-1 flex-col pb-6">
            {header}
            {scene}
          </div>
        </div>
        <div
          className={`relative -mx-5 -mt-6 flex shrink-0 flex-col rounded-t-[28px] px-5 pt-4 ${
            // 밤 장면은 어두운 보랏빛 유리 시트, 그 밖은 크림색 시트
            dark ? "glass-night glass-sheet" : "bg-[var(--bg)] shadow-[0_-12px_24px_-16px_rgba(110,60,40,0.45)]"
          } ${className}`}
        >
          {children}
          {footer && <div className="shrink-0 space-y-2 pb-3 pt-2">{footer}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className={`relative flex min-h-0 flex-1 flex-col ${scroll ? "overflow-y-auto overscroll-contain" : "overflow-hidden"} ${className}`}>{children}</div>
      {footer && <div className="shrink-0 space-y-2 pb-3 pt-2">{footer}</div>}
    </div>
  );
}

/** 컨테이너에 남은 높이·너비를 재서 그 안에 맞는 크기를 돌려준다 (별이·카드 크기 맞춤용). */
export function FitSize({
  min,
  max,
  ratio = 1,
  className = "",
  children,
}: {
  min: number;
  max: number;
  /** 높이 대비 너비 비율 (정사각형 = 1) */
  ratio?: number;
  className?: string;
  children: (size: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const s = Math.floor(Math.min(max, height, width / ratio));
      setSize(s >= min ? s : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max, ratio]);
  return (
    <div ref={ref} className={`flex min-h-0 flex-1 items-center justify-center ${className}`}>
      {size > 0 && children(size)}
    </div>
  );
}

/** 남는 높이에 맞춘 크기의 별이 (서버 컴포넌트에서도 쓸 수 있게 함수 자식 대신 props로 받는다) */
export function FitCharacter({
  min = 90,
  max = 280,
  className = "",
  ...stage
}: Omit<ComponentProps<typeof CharacterStage>, "size" | "className"> & { min?: number; max?: number; className?: string }) {
  return (
    <FitSize min={min} max={max} className={className}>
      {(size) => <CharacterStage size={size} {...stage} />}
    </FitSize>
  );
}

/**
 * 긴 내용을 한 화면 크기의 장으로 나눠 좌우로 넘긴다 (스와이프·점·이전/다음).
 * 각 장은 화면 안에 들어가게 만들고, 아주 작은 화면에서만 장 안에서 넘친 부분을 볼 수 있게 한다.
 */
export function Pager({ labels, children, className = "" }: { labels: string[]; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = Children.toArray(children);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== page) setPage(i);
        }}
        className="no-scrollbar -mx-5 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {pages.map((p, i) => (
          <section
            key={i}
            aria-label={labels[i]}
            aria-hidden={i !== page}
            className="no-scrollbar flex w-full shrink-0 snap-center snap-always flex-col overflow-y-auto px-5"
          >
            {p}
          </section>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-1 pt-2">
          <button type="button" onClick={() => go(Math.max(0, page - 1))} disabled={page === 0} aria-label="이전" className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-ink-2 disabled:opacity-30">
            ‹
          </button>
          {labels.map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => go(i)}
              aria-label={l}
              aria-current={i === page ? "step" : undefined}
              className="flex h-9 items-center justify-center px-1"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === page ? "w-5 bg-accent" : "w-1.5 bg-ink-2/35"}`} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(Math.min(pages.length - 1, page + 1))}
            disabled={page === pages.length - 1}
            aria-label="다음"
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-ink-2 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/** 카드 안의 목록·표를 몇 개씩 끊어 보여 준다 (‹ 1/3 ›). 좌우로 넘기는 Pager 안에서도 쓸 수 있다. */
export function Paged<T>({ items, per, children, empty = "데이터 없음" }: { items: T[]; per: number; children: (slice: T[]) => ReactNode; empty?: ReactNode }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / per));
  const cur = Math.min(page, pages - 1);
  if (!items.length) return <p className="text-sm text-ink-2">{empty}</p>;
  return (
    <>
      {children(items.slice(cur * per, (cur + 1) * per))}
      {pages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3 text-sm text-ink-2">
          <button type="button" onClick={() => setPage(cur - 1)} disabled={cur === 0} aria-label="이전 쪽" className="h-9 w-9 rounded-full text-xl disabled:opacity-30">
            ‹
          </button>
          <span className="tabular-nums">
            {cur + 1} / {pages}
          </span>
          <button type="button" onClick={() => setPage(cur + 1)} disabled={cur === pages - 1} aria-label="다음 쪽" className="h-9 w-9 rounded-full text-xl disabled:opacity-30">
            ›
          </button>
        </div>
      )}
    </>
  );
}
