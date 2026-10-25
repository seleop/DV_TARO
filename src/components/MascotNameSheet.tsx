"use client";

import { useEffect, useRef } from "react";
import { useVisualViewport } from "./auth/useVisualViewport";
import { MascotNameForm } from "./MascotNameForm";

/**
 * 마스코트 이름 바꾸기 시트 (프로필 설정). 아래에서 올라오고, 바깥을 누르거나 닫기·Esc로 닫는다.
 * 실제로 보이는 영역(키보드 제외)에 맞춰 키보드가 올라와도 입력칸·버튼이 가려지지 않는다.
 */
export function MascotNameSheet({ current, onSave, onClose }: { current: string; onSave: (name: string) => Promise<void>; onClose: () => void }) {
  const vv = useVisualViewport();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 mx-auto flex h-dvh w-full max-w-[440px] flex-col justify-end transition-[height,top] duration-300 ease-out motion-reduce:transition-none"
      style={vv ? { height: vv.height, top: vv.top } : undefined}
    >
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-[#1a1030]/45" />
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mascot-sheet-title"
        className="relative animate-rise rounded-t-[28px] bg-[var(--bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-16px_32px_-18px_rgba(60,30,80,0.55)] outline-none motion-reduce:animate-none"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="mascot-sheet-title" className="text-[17px] font-bold">
            캐릭터 이름 바꾸기
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-2 active:bg-black/5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <MascotNameForm initial={current} saveLabel="이 이름으로 바꾸기" hint="8자까지 · 바꾸면 모든 화면에서 이 이름으로 불러요" onSave={onSave} />
      </div>
    </div>
  );
}
