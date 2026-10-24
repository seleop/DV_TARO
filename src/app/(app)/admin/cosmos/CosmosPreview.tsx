"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CosmicBackground } from "@/components/cosmos/CosmicBackground";

/** 우주 배경 단독 미리보기: 사라지기/나타나기 전환과 초당 프레임을 확인한다 */
export function CosmosPreview() {
  const [active, setActive] = useState(true);
  const fpsRef = useRef<HTMLSpanElement>(null);

  // 초당 프레임 표시 (화면 글자만 바꾸고 React 렌더링은 일으키지 않는다)
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        if (fpsRef.current) fpsRef.current.textContent = `${Math.round((frames * 1000) / (now - last))} fps`;
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative -mx-5 flex min-h-0 flex-1">
      <CosmicBackground active={active} />
      <div className="relative flex flex-1 flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur">
            ‹ 관리
          </Link>
          <button type="button" onClick={() => setActive((v) => !v)} className="rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur">
            {active ? "사라지기" : "나타나기"}
          </button>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-[13px] text-white/70">우주 배경 미리보기 · 회원가입 화면에는 아직 쓰지 않아요</p>
          <span ref={fpsRef} className="text-xs tabular-nums text-white/50">
            – fps
          </span>
        </div>
      </div>
    </div>
  );
}
