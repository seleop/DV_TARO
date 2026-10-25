"use client";

import { useEffect, useState } from "react";
import type { BackdropKind } from "@/lib/scene";
import { DawnPath } from "./DawnPath";
import { ObservatoryBackdrop } from "./Observatory";
import { SanctumBackdrop } from "./Sanctum";
import { StudyBackdrop } from "./Study";

/**
 * 기능별 밤 장면 배경 (2026-10-25 사용자 결정, 디테일 SVG):
 * 타로 = 성소 · 오늘의 운세 = 새벽빛 언덕길(walking 이면 걸음에 맞춰 흐름) · 사주 = 한옥 서재 · 별자리 = 산꼭대기 천문대.
 * 홈은 고른 메뉴 카드의 배경을 쓴다. 종류가 바뀌면 새 배경이 위에서 부드럽게 나타나고(이전 배경은 그대로 두었다가) 다 나타나면 이전 배경을 치운다.
 */
export function SceneBackdrop({ kind, walking = false }: { kind: BackdropKind; walking?: boolean }) {
  const [layers, setLayers] = useState<Array<{ kind: BackdropKind; key: number }>>([{ kind, key: 0 }]);
  const top = layers[layers.length - 1];
  // 렌더 중 상태 갱신(이전 값과 다를 때만): 새 종류를 맨 위 층으로 올린다. 바로 아래 층 하나만 남긴다
  if (top.kind !== kind) setLayers([top, { kind, key: top.key + 1 }]);
  // 애니메이션이 없을 때(동작 줄이기 등)도 이전 배경을 치운다
  useEffect(() => {
    if (layers.length < 2) return;
    const t = setTimeout(() => setLayers((cur) => cur.slice(-1)), 700);
    return () => clearTimeout(t);
  }, [layers.length]);
  return (
    <>
      {layers.map((l, i) => (
        <div
          key={l.key}
          className={`absolute inset-0 ${i > 0 ? "animate-[scene-fade-in_.6s_ease-out_both] motion-reduce:animate-none" : ""}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setLayers((cur) => cur.slice(-1));
          }}
        >
          <Backdrop kind={l.kind} walking={walking} />
        </div>
      ))}
    </>
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
