"use client";

import { Children, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { CharacterStage } from "../Character";

/**
 * 스크롤 없는 화면 틀: 머리(header) · 본문(남는 높이만 사용) · 하단 버튼(footer).
 * 본문은 화면 높이를 넘지 않게 만들고, 내용이 길면 Pager로 나눠 좌우로 넘긴다.
 * scroll=true는 사주 설명처럼 길게 읽는 화면에서만 쓴다.
 */
export function Screen({
  header,
  footer,
  children,
  scroll = false,
  className = "",
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className={`relative flex min-h-0 flex-1 flex-col ${scroll ? "overflow-y-auto overscroll-contain" : "overflow-hidden"} ${className}`}>{children}</div>
      {footer && <div className="shrink-0 space-y-2 pb-3 pt-2">{footer}</div>}
    </div>
  );
}

/** 컨테이너에 남은 높이·너비를 재서 그 안에 맞는 크기를 돌려준다 (복이·카드 크기 맞춤용). */
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

/** 남는 높이에 맞춘 크기의 복이 (서버 컴포넌트에서도 쓸 수 있게 함수 자식 대신 props로 받는다) */
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
              <span className={`block h-1.5 rounded-full transition-all ${i === page ? "w-5 bg-accent" : "w-1.5 bg-white/30"}`} />
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
