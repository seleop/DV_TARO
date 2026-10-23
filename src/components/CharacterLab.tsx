"use client";

import { useState } from "react";
import { EXPRESSIONS, MOODS, SCENES, type Expression, type Mood, type Scene } from "@/lib/character";
import { MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { CharacterStage } from "./Character";
import { FortuneMascot } from "./FortuneMascot";
import { Card } from "./ui";

const SCENE_LABEL: Record<Scene, string> = {
  default: "기본 · 별 지팡이",
  thinking: "점치는 중 · 수정구슬",
  happy: "결과 · 두루마리",
  tarot: "타로 · 카드",
  star: "별자리 · 망원경",
  saju: "사주 · 책",
};
const MOOD_LABEL: Record<Mood, string> = { great: "대길 · 꽃가루", good: "좋음 · 네잎클로버", calm: "차분 · 따뜻한 차", careful: "쉬어가기 · 우산" };
const EXPRESSION_LABEL: Record<Expression, string> = {
  neutral: "기본",
  blink: "깜빡",
  happy: "웃음",
  excited: "신남",
  calm: "차분",
  thinking: "생각",
  worried: "걱정",
  surprised: "놀람",
  sleepy: "하품",
};

const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${on ? "bg-white text-[#2a2440]" : "bg-white/10 text-ink-2"}`;

export function CharacterLab() {
  const [scene, setScene] = useState<Scene>("default");
  const [mood, setMood] = useState<Mood | null>(null);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <Card className="flex flex-col items-center">
        <p className="text-xs text-ink-2">캐릭터를 톡 눌러 보세요 · 다섯 번 연타하면 어지러워해요</p>
        <CharacterStage key={`${scene}-${mood}`} pose={scene} mood={mood} size={280} orbs={false} className="my-3" />
        <div className="flex flex-wrap justify-center gap-2">
          {SCENES.map((s) => (
            <button key={s} type="button" className={chip(scene === s && !mood)} onClick={() => (setScene(s), setMood(null))}>
              {SCENE_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-2">운세 결과 분위기</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-2">
          {MOODS.map((m) => (
            <button key={m} type="button" className={chip(mood === m)} onClick={() => (setScene("happy"), setMood(m))}>
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      </Card>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">3D 마스코트 복이 · 동작</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.keys(MASCOT_SHEETS) as MascotState[]).map((st) => (
            <Card key={st} className="flex flex-col items-center !p-2">
              <FortuneMascot state={st} size={150} loop />
              <p className="pb-1 text-xs text-ink-2">
                {st} · {MASCOT_SHEETS[st].frames}프레임 {MASCOT_SHEETS[st].fps}fps · {Math.round(MASCOT_SHEETS[st].bytes / 1024)}KB
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">SVG 별토끼 · 장면별 소품</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {SCENES.map((s) => (
            <Card key={s} className="flex flex-col items-center !p-2">
              <CharacterStage character="svg" pose={s} size={150} orbs={false} />
              <p className="pb-1 text-xs text-ink-2">{SCENE_LABEL[s]}</p>
            </Card>
          ))}
          {MOODS.map((m) => (
            <Card key={m} className="flex flex-col items-center !p-2">
              <CharacterStage character="svg" pose="happy" mood={m} size={150} orbs={false} />
              <p className="pb-1 text-xs text-ink-2">{MOOD_LABEL[m]}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">SVG 별토끼 · 표정</h2>
        <div className="grid grid-cols-3 gap-2">
          {EXPRESSIONS.map((e) => (
            <Card key={e} className="flex flex-col items-center !p-1.5">
              <CharacterStage character="svg" expression={e} size={100} orbs={false} interactive={false} />
              <p className="pb-1 text-[11px] text-ink-2">{EXPRESSION_LABEL[e]}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
