/**
 * 홈 밤하늘 배경 시안 3차 (2026-10-25 사용자 결정: 디테일한 SVG로, 단조롭지 않게, 성능은 신경 쓰지 말 것. 토픽 = 우주·점술·운세·타로).
 * 사용자가 고르면 하나만 남기고 정리한다. 부품은 ./backdrops/common·art.
 */
import type { ReactNode } from "react";
import { AstrolabeHill } from "./backdrops/Astrolabe";
import { CrystalTable } from "./backdrops/CrystalTable";
import { EasternSky } from "./backdrops/EasternSky";
import { GalaxyWheel } from "./backdrops/GalaxyWheel";
import { MoonLake } from "./backdrops/MoonLake";
import { TarotSanctum } from "./backdrops/TarotSanctum";

export type HomeBackdropId = "1" | "2" | "3" | "4" | "5" | "6";

export const HOME_BACKDROPS: Record<HomeBackdropId, { name: string; render: () => ReactNode }> = {
  "1": { name: "점성술사의 언덕", render: () => <AstrolabeHill /> },
  "2": { name: "타로의 성소", render: () => <TarotSanctum /> },
  "3": { name: "달의 호수", render: () => <MoonLake /> },
  "4": { name: "운명의 은하", render: () => <GalaxyWheel /> },
  "5": { name: "천상열차 별궁", render: () => <EasternSky /> },
  "6": { name: "점술사의 수정구", render: () => <CrystalTable /> },
};

export function isHomeBackdropId(v: unknown): v is HomeBackdropId {
  return typeof v === "string" && v in HOME_BACKDROPS;
}
