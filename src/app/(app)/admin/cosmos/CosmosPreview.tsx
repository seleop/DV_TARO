"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CosmicBackground } from "@/components/cosmos/CosmicBackground";
import type { JourneyStage } from "@/components/cosmos/stages";

/** 장 고르기 (회원가입 단계와 같은 이름) */
const STAGES: Array<[JourneyStage, string]> = [
  ["intro", "첫 화면"],
  ["cruise", "기본"],
  ["enter", "이메일·진입"],
  ["ignite", "비밀번호"],
  ["nebula", "닉네임"],
  ["core", "동의·중심부"],
  ["arrive", "완료"],
];

/** 우주 배경 단독 미리보기: 장(회원가입 단계별 연출) 전환, 단계 완료 워프, 사라지기/나타나기, 초당 프레임을 확인한다 */
export function CosmosPreview() {
  const [active, setActive] = useState(true);
  const [stage, setStage] = useState<JourneyStage>("cruise");
  // 지금까지 마친 단계 수 (누를 때마다 워프·다음 구도·하늘 색조·충격파)
  const [beat, setBeat] = useState<number | undefined>(undefined);
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
      <CosmicBackground active={active} stage={stage} beat={beat} />
      <div className="relative flex flex-1 flex-col justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur">
            ‹ 관리
          </Link>
          <button type="button" onClick={() => setActive((v) => !v)} className="rounded-full bg-white/10 px-3 py-2 text-sm backdrop-blur">
            {active ? "사라지기" : "나타나기"}
          </button>
        </div>
        <div className="space-y-2 text-center">
          <div className="flex flex-wrap justify-center gap-1.5">
            {STAGES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStage(id)}
                aria-pressed={stage === id}
                className={`rounded-full px-3 py-1.5 text-xs backdrop-blur ${stage === id ? "bg-white text-[#1c1640]" : "bg-white/10"}`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setBeat((b) => (b ?? 0) + 1)} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold">
              단계 완료(워프){beat !== undefined ? ` ${beat}` : ""}
            </button>
          </div>
          <p className="text-[13px] text-white/70">우주 배경 미리보기 · 회원가입 단계별 연출을 골라 볼 수 있어요</p>
          <span ref={fpsRef} className="text-xs tabular-nums text-white/50">
            – fps
          </span>
        </div>
      </div>
    </div>
  );
}
