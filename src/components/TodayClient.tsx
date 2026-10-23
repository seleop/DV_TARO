"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND } from "@/config/brand";
import type { DailyReading } from "@/lib/ai/schemas";
import { api, errorText } from "@/lib/client";
import { josa } from "@/lib/josa";
import { CharacterStage } from "./Character";
import { ShareBar } from "./ShareBar";
import { BottomActions, Button, Card, Disclaimer, ErrorBox, MockNotice, Tile, TopBar } from "./ui";

type Result = { reading: { content: DailyReading; provider: string }; today: { date: string; day: string; tenGod?: string }; cached: boolean };
const TABS = [
  { key: "love", emoji: "💘", label: "연애운" },
  { key: "work", emoji: "💼", label: "직업운" },
  { key: "luck", emoji: "🌊", label: "행운 기운" },
  { key: "food", emoji: "🍽️", label: "추천 음식" },
] as const;

export function TodayClient({ calculationId, displayName, aiProvider }: { calculationId: string; displayName: string; aiProvider: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("love");
  const captureRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        setData(await api<Result>(`/api/saju/${calculationId}/daily`, { body: { regenerate } }));
      } catch (e) {
        setError(errorText(e));
      } finally {
        setLoading(false);
      }
    },
    [calculationId],
  );

  useEffect(() => {
    // 화면에 들어오면 오늘 운세를 불러온다 (같은 날에는 저장된 결과를 재사용)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 데이터 요청
    void load(false);
  }, [load]);

  const r = data?.reading.content;
  const [y, m, d] = (data?.today.date ?? "").split("-");
  const detail = r
    ? { love: r.love, work: r.work, luck: r.luck, food: `${r.food.name} — ${r.food.reason}` }[tab]
    : "";

  return (
    <div className="flex flex-1 flex-col">
      <TopBar back="/" />
      {loading && !r ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
          <CharacterStage pose="thinking" size={250} />
          <p className="mt-6 text-[17px] font-semibold">{josa(BRAND.characterName, "이/가")} 점치는 중…</p>
          <p className="mt-1 text-sm text-ink-2">오늘의 일진을 살펴보고 있어요</p>
        </div>
      ) : error && !r ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-24 text-center">
          <CharacterStage pose="default" size={200} orbs={false} />
          <ErrorBox message={error} />
          <Button variant="ghost" onClick={() => load(false)}>
            다시 시도
          </Button>
        </div>
      ) : r ? (
        <>
          <div ref={captureRef} className="flex flex-col items-center px-1 pb-4 pt-2 text-center">
            <p className="text-[17px] text-ink-2">
              {y}년 {Number(m)}월 {Number(d)}일 {josa(displayName, "은/는")}
            </p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight">{r.headline}</h1>
            <CharacterStage pose="happy" size={230} orbs={false} className="my-3" />
            <p className="-mt-2 mb-4 text-xs text-ink-2">
              오늘 일진 {data!.today.day}
              {data!.today.tenGod ? ` · ${data!.today.tenGod}의 날` : ""}
            </p>
            <Card className="w-full space-y-3 text-left">
              {r.highlights.map((h, i) => (
                <p key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                  <span className="text-xl leading-6" aria-hidden>
                    {h.emoji}
                  </span>
                  <span>{h.text}</span>
                </p>
              ))}
            </Card>
          </div>

          <MockNotice provider={data!.reading.provider ?? aiProvider} />

          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {TABS.map((t) => (
              <Tile key={t.key} emoji={t.emoji} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
            ))}
          </div>
          <Card className="mt-3 animate-rise" key={tab}>
            <p className="mb-1 text-[13px] font-semibold text-accent">{TABS.find((t) => t.key === tab)!.label}</p>
            <p className="text-[15px] leading-relaxed">{detail}</p>
          </Card>

          <Card className="mt-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1">🎨 행운 색 · {r.lucky.color}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">🍀 행운 아이템 · {r.lucky.item}</span>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">💡 {r.tip}</p>
          </Card>

          <details className="mt-3 rounded-[22px] bg-white/5 px-5 py-3 text-sm text-ink-2">
            <summary className="cursor-pointer">이렇게 풀이했어요</summary>
            <ul className="mt-2 space-y-1">
              {r.evidence.map((e, i) => (
                <li key={i}>
                  <b className="text-ink">{e.claim}</b> — {e.basis}
                </li>
              ))}
            </ul>
          </details>
          <button className="mx-auto mt-4 text-xs text-ink-2 underline underline-offset-4" onClick={() => load(true)} disabled={loading}>
            {loading ? "다시 점치는 중…" : "오늘 운세 다시 받기"}
          </button>
          <Disclaimer className="mt-4" />

          <BottomActions>
            <ShareBar
              targetRef={captureRef}
              fileName={`오늘의운세-${data!.today.date}`}
              shareTitle={`${data!.today.date} 오늘의 운세 · ${r.headline}`}
              shareText={r.highlights.map((h) => `${h.emoji} ${h.text}`).join("\n")}
            />
          </BottomActions>
        </>
      ) : null}
    </div>
  );
}
