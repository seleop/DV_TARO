"use client";

import { useState, type ReactNode } from "react";
import { EXPRESSIONS, MOODS, SCENES, type Expression, type Mood, type Scene } from "@/lib/character";
import { MASCOT_SHEETS, type MascotState } from "@/config/mascot-assets";
import { CharacterStage } from "./Character";
import { FortuneMascot } from "./FortuneMascot";
import { Card } from "./ui";
import { FitSize, Pager } from "./app/Screen";

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

const OUTFIT_LABEL = { saju: "사주 복이 · 갓·안경·사주책", tarot: "타로 복이 · 마법사 모자·망토·카드", star: "별자리 복이 · 베레모·목도리·망원경" } as const;

const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${on ? "bg-accent text-white" : "bg-tile text-ink-2"}`;

export function CharacterLab() {
  const [scene, setScene] = useState<Scene>("default");
  const [mood, setMood] = useState<Mood | null>(null);

  // 스크롤 없이: 무대 / 3D 동작 / SVG 장면 / SVG 분위기 / SVG 표정을 장으로 나눠 좌우로 넘긴다
  return (
    <div className="flex min-h-0 flex-1 flex-col pb-3">
      <Pager labels={["무대", "의상별 복이", "3D 기본 동작", "3D 의상 동작", "SVG 장면별 소품", "SVG 결과 분위기", "SVG 표정"]}>
        <Card className="flex min-h-0 flex-1 flex-col items-center">
          <p className="shrink-0 text-xs text-ink-2">캐릭터를 톡 눌러 보세요 · 다섯 번 연타하면 어지러워해요</p>
          <FitSize min={100} max={280} className="w-full py-2">
            {(size) => <CharacterStage key={`${scene}-${mood}`} pose={scene} mood={mood} size={size} orbs={false} />}
          </FitSize>
          <div className="flex shrink-0 flex-wrap justify-center gap-2">
            {SCENES.map((s) => (
              <button
                key={s}
                type="button"
                className={chip(scene === s && !mood)}
                onClick={() => {
                  setScene(s);
                  setMood(null);
                }}
              >
                {SCENE_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="mt-3 shrink-0 text-xs text-ink-2">운세 결과 분위기</p>
          <div className="mt-1.5 flex shrink-0 flex-wrap justify-center gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={chip(mood === m)}
                onClick={() => {
                  setScene("happy");
                  setMood(m);
                }}
              >
                {MOOD_LABEL[m]}
              </button>
            ))}
          </div>
        </Card>

        <Gallery title="의상별 복이 · 톡 누르면 반응" cols={1}>
          {(["saju", "tarot", "star"] as const).map((o) => (
            <Card key={o} className="flex items-center gap-3 !p-2">
              <CharacterStage pose={o} size={130} orbs={false} />
              <p className="text-xs text-ink-2">{OUTFIT_LABEL[o]}</p>
            </Card>
          ))}
        </Gallery>

        <Gallery title="3D 마스코트 복이 · 기본 동작" cols={3}>
          {SHEET_NAMES.filter((st) => MASCOT_SHEETS[st].outfit === "default").map((st) => (
            <SheetCard key={st} st={st} />
          ))}
        </Gallery>

        <Gallery title="3D 마스코트 복이 · 의상 동작" cols={3}>
          {SHEET_NAMES.filter((st) => MASCOT_SHEETS[st].outfit !== "default").map((st) => (
            <SheetCard key={st} st={st} />
          ))}
        </Gallery>

        <Gallery title="SVG 별토끼 · 장면별 소품" cols={3}>
          {SCENES.map((s) => (
            <Card key={s} className="flex flex-col items-center !p-1.5">
              <CharacterStage character="svg" pose={s} size={90} orbs={false} />
              <p className="pb-1 text-center text-[11px] text-ink-2">{SCENE_LABEL[s]}</p>
            </Card>
          ))}
        </Gallery>

        <Gallery title="SVG 별토끼 · 결과 분위기" cols={2}>
          {MOODS.map((m) => (
            <Card key={m} className="flex flex-col items-center !p-2">
              <CharacterStage character="svg" pose="happy" mood={m} size={120} orbs={false} />
              <p className="pb-1 text-xs text-ink-2">{MOOD_LABEL[m]}</p>
            </Card>
          ))}
        </Gallery>

        <Gallery title="SVG 별토끼 · 표정" cols={3}>
          {EXPRESSIONS.map((e) => (
            <Card key={e} className="flex flex-col items-center !p-1.5">
              <CharacterStage character="svg" expression={e} size={80} orbs={false} interactive={false} />
              <p className="pb-1 text-[11px] text-ink-2">{EXPRESSION_LABEL[e]}</p>
            </Card>
          ))}
        </Gallery>
      </Pager>
    </div>
  );
}

const SHEET_NAMES = Object.keys(MASCOT_SHEETS) as MascotState[];

/** 시트 하나를 반복 재생 (이름·프레임·용량 표시) */
function SheetCard({ st }: { st: MascotState }) {
  const s = MASCOT_SHEETS[st];
  return (
    <Card className="flex flex-col items-center !p-1.5">
      <FortuneMascot state={st} size={92} loop />
      <p className="pb-0.5 text-center text-[10px] leading-tight text-ink-2">
        {st}
        <br />
        {s.frames}f · {Math.round(s.bytes / 1024)}KB
      </p>
    </Card>
  );
}

function Gallery({ title, cols, children }: { title: string; cols: 1 | 2 | 3; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">{title}</h2>
      <div className={`grid gap-2 ${cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{children}</div>
    </div>
  );
}
