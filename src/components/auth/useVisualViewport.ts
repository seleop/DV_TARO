"use client";

import { useSyncExternalStore } from "react";

/**
 * 실제로 보이는 화면 영역(키보드를 뺀 높이와 위치).
 * 화면을 이 크기에 맞추면 키보드가 올라와도 스크롤 없이 입력칸·버튼이 보인다.
 * (iOS Safari는 키보드가 올라와도 100dvh가 줄지 않고, Android Chrome도 기본값은 보이는 영역만 줄인다.)
 */
function subscribe(cb: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", cb);
  vv.addEventListener("scroll", cb);
  return () => {
    vv.removeEventListener("resize", cb);
    vv.removeEventListener("scroll", cb);
  };
}

function snapshot() {
  const vv = window.visualViewport;
  return vv ? `${Math.round(vv.height)}|${Math.round(vv.offsetTop)}|${Math.round(vv.width)}` : "";
}

export function useVisualViewport(): { height: number; top: number; width: number } | null {
  const s = useSyncExternalStore(subscribe, snapshot, () => "");
  if (!s) return null;
  const [height, top, width] = s.split("|").map(Number);
  return { height, top, width };
}
