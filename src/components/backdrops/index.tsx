"use client";

import type { BackdropKind } from "@/lib/scene";
import { DawnPath } from "./DawnPath";
import { ObservatoryBackdrop } from "./Observatory";
import { PorchBackdrop } from "./Porch";
import { SanctumBackdrop } from "./Sanctum";
import { StudyBackdrop } from "./Study";

/**
 * 기능별 밤 장면 배경 (2026-10-25 사용자 결정, 디테일 SVG):
 * 홈 = 점집 입구 · 타로 = 성소 · 오늘의 운세 = 새벽빛 언덕길(walking 이면 걸음에 맞춰 흐름) · 사주 = 한옥 서재 · 별자리 = 산꼭대기 천문대
 */
export function SceneBackdrop({ kind, walking = false }: { kind: BackdropKind; walking?: boolean }) {
  switch (kind) {
    case "porch":
      return <PorchBackdrop />;
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
