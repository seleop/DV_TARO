"use client";

import { useEffect, useState } from "react";
import type { BackdropKind } from "@/lib/scene";
import { DawnPath } from "./DawnPath";
import { ObservatoryBackdrop } from "./Observatory";
import { SanctumBackdrop } from "./Sanctum";
import { StudyBackdrop } from "./Study";

/** 새 배경이 이전 배경 위에서 나타나는 시간 (globals.css scene-fade-in) */
const FADE_MS = 300;

/**
 * 기능별 밤 장면 배경 (2026-10-25 사용자 결정, 디테일 SVG):
 * 타로 = 성소 · 오늘의 운세 = 새벽빛 언덕길(walking 이면 걸음에 맞춰 흐름) · 사주 = 한옥 서재 · 별자리 = 산꼭대기 천문대.
 * 홈은 고른 메뉴 카드의 배경을 쓴다. 종류가 바뀌면 새 배경이 이전 배경 위에서 0.3초 동안 나타나고, 다 나타나면 이전 배경을 숨긴다.
 * 한 번 그린 배경은 지우지 않고 숨겨 둔다(display:none — 움직임·그리기 비용 없음). 다시 고르면 SVG 를 새로 만들지 않아 바로 바뀐다
 */
export function SceneBackdrop({ kind, walking = false }: { kind: BackdropKind; walking?: boolean }) {
  const [view, setView] = useState<{ cur: BackdropKind; prev: BackdropKind | null; mounted: BackdropKind[] }>({ cur: kind, prev: null, mounted: [kind] });
  // 렌더 중 상태 갱신(이전 값과 다를 때만): 새 종류를 맨 위로 올리고, 바로 전 배경만 그 아래 남긴다
  if (view.cur !== kind) setView({ cur: kind, prev: view.cur, mounted: view.mounted.includes(kind) ? view.mounted : [...view.mounted, kind] });
  const settle = () => setView((v) => (v.prev ? { ...v, prev: null } : v));
  // 애니메이션이 없을 때(동작 줄이기 등)도 이전 배경을 숨긴다
  useEffect(() => {
    if (!view.prev) return;
    const t = setTimeout(() => setView((v) => (v.prev ? { ...v, prev: null } : v)), FADE_MS + 100);
    return () => clearTimeout(t);
  }, [view.prev, view.cur]);
  return (
    // isolate: 층의 z-index 가 이 안에서만 통하게 (밖의 마스코트·말풍선보다 위로 올라가지 않게)
    <div className="absolute inset-0 isolate">
      {view.mounted.map((k) => {
        const on = k === view.cur;
        return (
          <div
            key={k}
            // contain: 배경 안에서 다시 그려도 바깥(시트·마스코트)까지 번지지 않게. 맨 위(cur)는 이전 배경이 있을 때만 나타나는 애니메이션. 숨겨 있던 층이 다시 보이면 애니메이션이 처음부터 다시 돈다
            className={`absolute inset-0 [contain:strict] ${on ? "z-[1]" : "z-0"} ${on && view.prev ? "animate-[scene-fade-in_.3s_ease-out_both] motion-reduce:animate-none" : ""}`}
            style={on || k === view.prev ? undefined : { display: "none" }}
            onAnimationEnd={(e) => {
              if (on && e.target === e.currentTarget) settle();
            }}
          >
            <Backdrop kind={k} walking={walking} />
          </div>
        );
      })}
    </div>
  );
}

function Backdrop({ kind, walking }: { kind: BackdropKind; walking: boolean }) {
  switch (kind) {
    case "sanctum":
      return <SanctumBackdrop />;
    case "dawn":
      return <DawnPath walking={walking} />;
    case "study":
      return <StudyBackdrop />;
    case "observatory":
      return <ObservatoryBackdrop />;
  }
}
