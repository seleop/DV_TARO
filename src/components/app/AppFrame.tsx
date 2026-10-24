"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SCENE_BOTTOM, SCENE_TOP, sceneForPath } from "@/lib/scene";

/**
 * 앱 바깥 틀. PC에서는 가운데 폰 폭(440px), 모바일에서는 전체 화면.
 * 위쪽 절반은 장면 하늘색(상태 표시줄 뒤가 장면과 이어지게), 아래쪽 절반은 시트의 크림색(밤 장면은 어두운 남보라)으로 칠한다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const scene = sceneForPath(usePathname());
  return (
    <div
      data-scene={scene}
      className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden supports-[overflow:clip]:overflow-clip shadow-[0_0_60px_rgba(80,40,60,0.18)]"
      style={{ background: `linear-gradient(180deg, ${SCENE_TOP[scene]} 0 50%, ${SCENE_BOTTOM[scene] ?? "var(--bg)"} 50% 100%)` }}
    >
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
