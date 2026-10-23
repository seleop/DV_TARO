"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND } from "@/config/brand";
import type { DailyReading } from "@/lib/ai/schemas";
import { api, errorText } from "@/lib/client";
import { josa } from "@/lib/josa";
import { FitCharacter, Pager, Screen } from "./app/Screen";
import { ShareBar } from "./ShareBar";
import { Button, Card, Disclaimer, ErrorBox, MockNotice, Tile, TopBar } from "./ui";

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

  // 위: 천막 입구 장면(별이) / 아래: 크림색 시트(결과)
  const scene = (
    <div className="flex min-h-0 flex-1 flex-col items-center text-center">
      {loading && !r ? (
        <>
          <p className="mt-1 shrink-0 text-[17px] font-semibold text-ink">{josa(BRAND.characterName, "이/가")} 점치는 중…</p>
          <p className="mt-0.5 shrink-0 text-sm text-ink-2">오늘의 일진을 살펴보고 있어요</p>
          <FitCharacter pose="thinking" min={100} max={280} className="w-full items-end" />
        </>
      ) : error && !r ? (
        <FitCharacter pose="default" min={90} max={240} className="w-full items-end" />
      ) : r ? (
        <>
          <p className="shrink-0 text-[14px] font-semibold text-ink-2">
            {y}년 {Number(m)}월 {Number(d)}일 {josa(displayName, "은/는")}
          </p>
          <h1 className="mt-0.5 shrink-0 text-[clamp(22px,3.4dvh,28px)] font-extrabold leading-tight text-ink">{r.headline}</h1>
          <FitCharacter pose="happy" mood={r.mood} min={80} max={260} className="w-full items-end" />
        </>
      ) : null}
    </div>
  );

  return (
    <Screen
      header={<TopBar back="/" />}
      scene={scene}
      footer={
        r ? (
          <ShareBar
            targetRef={captureRef}
            fileName={`오늘의운세-${data!.today.date}`}
            shareTitle={`${data!.today.date} 오늘의 운세 · ${r.headline}`}
            shareText={r.highlights.map((h) => `${h.emoji} ${h.text}`).join("\n")}
          />
        ) : undefined
      }
    >
      {loading && !r ? (
        <p className="pb-6 pt-2 text-center text-sm text-ink-2">잠시만 기다려 주세요</p>
      ) : error && !r ? (
        <div className="space-y-3 pb-4">
          <ErrorBox message={error} />
          <Button variant="ghost" className="w-full" onClick={() => load(false)}>
            다시 시도
          </Button>
        </div>
      ) : r ? (
        <div className="flex h-[min(46dvh,340px)] flex-col">
          <Pager labels={["오늘의 운세 요약", "분야별 운세", "행운과 풀이"]}>
            {/* 1장: 요약 (공유 이미지로 저장되는 부분) */}
            <div ref={captureRef} className="flex flex-col gap-2 bg-[var(--bg)] pb-1">
              <p className="text-center text-xs text-ink-2">
                {r.headline} · 오늘 일진 {data!.today.day}
                {data!.today.tenGod ? ` · ${data!.today.tenGod}의 날` : ""}
              </p>
              <Card className="w-full space-y-2.5 text-left">
                {r.highlights.map((h, i) => (
                  <p key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                    <span className="text-xl leading-6" aria-hidden>
                      {h.emoji}
                    </span>
                    <span>{h.text}</span>
                  </p>
                ))}
              </Card>
              <MockNotice provider={data!.reading.provider ?? aiProvider} />
            </div>

            {/* 2장: 분야별 */}
            <div className="flex flex-col">
              <div className="grid grid-cols-4 gap-2.5">
                {TABS.map((t) => (
                  <Tile key={t.key} emoji={t.emoji} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
                ))}
              </div>
              <Card className="mt-3 animate-rise" key={tab}>
                <p className="mb-1 text-[13px] font-semibold text-accent">{TABS.find((t) => t.key === tab)!.label}</p>
                <p className="text-[15px] leading-relaxed">{detail}</p>
              </Card>
            </div>

            {/* 3장: 행운·풀이 근거 */}
            <div className="flex flex-col gap-3">
              <Card>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-tile px-3 py-1">🎨 행운 색 · {r.lucky.color}</span>
                  <span className="rounded-full bg-tile px-3 py-1">🍀 행운 아이템 · {r.lucky.item}</span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">💡 {r.tip}</p>
              </Card>
              <div className="rounded-[22px] bg-tile px-5 py-3 text-sm text-ink-2">
                <p className="mb-1.5 font-semibold text-ink">이렇게 풀이했어요</p>
                <ul className="space-y-1">
                  {r.evidence.map((e, i) => (
                    <li key={i}>
                      <b className="text-ink">{e.claim}</b> — {e.basis}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="mx-auto text-xs text-ink-2 underline underline-offset-4" onClick={() => load(true)} disabled={loading}>
                {loading ? "다시 점치는 중…" : "오늘 운세 다시 받기"}
              </button>
              <Disclaimer />
            </div>
          </Pager>
        </div>
      ) : null}
    </Screen>
  );
}
