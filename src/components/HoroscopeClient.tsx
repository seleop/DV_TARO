"use client";

import { useEffect, useRef, useState } from "react";
import type { Mood } from "@/lib/character";
import { api, errorText } from "@/lib/client";
import { FitCharacter, Pager, Screen } from "./app/Screen";
import { ShareBar } from "./ShareBar";
import { Button, Card, Disclaimer, ErrorBox, MockNotice, TopBar } from "./ui";

type Sign = { id: string; nameKo: string; symbol: string; element: string; range: string };
type Result = {
  provider: string;
  cached: boolean;
  content: { headline: string; overall: string; love: string; work: string; money: string; tip: string; mood?: Mood; sign: { nameKo: string; symbol: string; element: string }; date: string };
};

const STORAGE_KEY = "fortune.horoscope.sign";

export function HoroscopeClient({ signs, profileSignId }: { signs: Sign[]; profileSignId: string | null }) {
  const [selected, setSelected] = useState<string | null>(profileSignId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 마지막으로 고른 별자리 기억 (이 기기에서만, 개인정보 아님)
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 선택 복원
      if (v && signs.some((s) => s.id === v)) setSelected(v);
    } catch {
      /* 저장소 사용 불가 */
    }
  }, [signs]);

  async function load(regenerate: boolean) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, selected);
    } catch {
      /* 무시 */
    }
    try {
      setResult(await api<Result>("/api/horoscope", { body: { signId: selected, regenerate } }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const r = result.content;
    return (
      <Screen
        header={<TopBar title="별자리 운세" back={null} right={<button onClick={() => setResult(null)} className="text-sm text-ink-2">변경</button>} />}
        footer={<ShareBar targetRef={captureRef} fileName={`별자리-${r.sign.nameKo}`} shareTitle={`${r.date} ${r.sign.nameKo} 운세`} shareText={`${r.headline}\n${r.overall}`} />}
      >
        <Pager labels={["오늘의 별자리 운세", "사랑·일·돈", "오늘의 팁"]}>
          {/* 1장: 요약 (공유 이미지로 저장되는 부분) */}
          <div ref={captureRef} className="flex min-h-0 flex-1 flex-col items-center pb-2 text-center">
            <p className="shrink-0 text-[15px] text-ink-2">
              {r.date} · {r.sign.symbol} {r.sign.nameKo}
            </p>
            <h1 className="mt-1 shrink-0 text-[clamp(21px,3.3dvh,26px)] font-bold leading-tight">{r.headline}</h1>
            <FitCharacter pose="star" mood={r.mood} orbs={false} min={80} max={200} className="w-full py-1" />
            <Card className="w-full shrink-0 text-left">
              <p className="text-[15px] leading-relaxed">{r.overall}</p>
            </Card>
            <MockNotice provider={result.provider} />
          </div>

          {/* 2장: 분야별 */}
          <div className="flex flex-col gap-3 pt-2">
            {[
              ["💘", "사랑", r.love],
              ["💼", "일", r.work],
              ["💰", "돈", r.money],
            ].map(([e, t, v]) => (
              <Card key={t}>
                <p className="text-[13px] font-semibold text-accent">
                  {e} {t}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed">{v}</p>
              </Card>
            ))}
          </div>

          {/* 3장: 팁 */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 pt-2">
            <FitCharacter pose="star" mood={r.mood} orbs={false} min={80} max={180} className="w-full" />
            <Card className="shrink-0">
              <p className="text-[15px]">💡 {r.tip}</p>
            </Card>
            <button className="mx-auto shrink-0 text-xs text-ink-2 underline underline-offset-4" onClick={() => load(true)} disabled={busy}>
              {busy ? "다시 보는 중…" : "다시 받기"}
            </button>
            <Disclaimer className="shrink-0 pb-2" />
          </div>
        </Pager>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <ErrorBox message={error} />
          <Button size="lg" className="w-full" disabled={!selected} loading={busy} onClick={() => load(false)}>
            {busy ? "별을 읽는 중…" : "오늘의 별자리 운세 보기"}
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(0.75rem,4dvh,2.5rem)] text-center">
        <p className="shrink-0 text-[clamp(16px,2.5dvh,19px)] font-semibold">오늘 별들이 전하는 이야기</p>
        <h1 className="text-gradient mt-1 shrink-0 text-[clamp(28px,4.6dvh,36px)] font-extrabold">별자리 운세</h1>
        <p className="mt-1 shrink-0 text-sm text-ink-2">{profileSignId ? "프로필 생일 기준으로 골라 뒀어요. 다른 별자리도 볼 수 있어요" : "내 별자리를 골라 주세요"}</p>
        <div className="mt-[clamp(0.5rem,2.5dvh,1.5rem)] grid w-full shrink-0 grid-cols-4 gap-2">
          {signs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              aria-pressed={selected === s.id}
              className={`flex flex-col items-center rounded-[18px] py-[clamp(0.4rem,1.2dvh,0.75rem)] transition active:scale-95 ${selected === s.id ? "bg-white/20 ring-2 ring-accent" : "bg-tile"}`}
            >
              <span className="text-[24px] leading-none text-[#e3d7ff]">{s.symbol}</span>
              <span className="mt-1 text-[12px] font-semibold">{s.nameKo}</span>
              <span className="text-[9px] text-ink-2">{s.range}</span>
            </button>
          ))}
        </div>
        <FitCharacter pose="star" orbs={false} min={70} max={170} className="w-full" />
      </div>
    </Screen>
  );
}
