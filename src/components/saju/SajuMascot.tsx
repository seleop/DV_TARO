"use client";

import { MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { motionForCue, type Cue } from "@/lib/dialogue";
import { resolveSheet } from "@/lib/mascot";
import { useState } from "react";
import { FortuneMascot } from "../FortuneMascot";

const NAMES: ReadonlySet<string> = new Set(Object.keys(MASCOT_SHEETS));
/** 사주 의상(갓·사주책)에 그 동작 시트가 있는지 */
const has = (s: string) => NAMES.has(`saju-${s}`);
const sheet = (motion: string) => resolveSheet("saju", motion, NAMES) as MascotState;

/**
 * 대화형 사주 결과의 별이 (사주 의상).
 * - 대사가 바뀔 때(cueId) 그 대사의 동작 신호(cue)가 한 번 재생 동작이면(가리키기·갸웃·숨 고르기 등) 먼저 한 번 하고
 * - 그 밖에는 바탕 동작: 말하는 중(typing) talk, 말을 마치면 기본 자세, 위로가 필요한 말(comfort)은 엎드려 곁에 있기(sit)
 */
export function SajuMascot({ cue, cueId, typing, size, label }: { cue: Cue | null; cueId: number; typing: boolean; size: number; label: string }) {
  // 한 번 재생 동작을 마친 대사 번호 (대사가 바뀌면 다시 재생)
  const [played, setPlayed] = useState(-1);
  const motion = cue ? motionForCue(cue, has) : null;
  const shot = motion ? sheet(motion) : null;
  const oneShot = shot && !MASCOT_SHEETS[shot].loop && played !== cueId ? shot : null;
  const base: MascotState = motion === "sit" ? sheet("sit") : typing ? sheet("talk") : sheet("idle");
  const state = oneShot ?? base;
  return (
    <FortuneMascot
      state={state}
      playId={oneShot ? cueId : 0}
      size={size}
      label={label}
      preload={[sheet("talk"), sheet("point"), sheet("listen")]}
      onAnimationComplete={(st) => {
        if (st === oneShot) setPlayed(cueId);
      }}
    />
  );
}
