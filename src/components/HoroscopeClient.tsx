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
        // 위: 별빛 정원에서 망원경을 든 복이 / 아래: 운세 내용 (좌우로 넘김)
        scene={
          <div className="flex min-h-0 flex-1 flex-col items-center text-center">
            <p className="shrink-0 text-[14px] text-ink-2">
              {r.date} · {r.sign.symbol} {r.sign.nameKo}
            </p>
            <h1 className="mt-0.5 shrink-0 text-[clamp(20px,3.2dvh,25px)] font-extrabold leading-tight text-ink">{r.headline}</h1>
            <FitCharacter pose="star" mood={r.mood} min={80} max={260} className="w-full items-end" />
          </div>
        }
        footer={<ShareBar targetRef={captureRef} fileName={`별자리-${r.sign.nameKo}`} shareTitle={`${r.date} ${r.sign.nameKo} 운세`} shareText={`${r.headline}
${r.overall}`} />}
      >
        <div className="flex h-[min(42dvh,320px)] flex-col">
          <Pager labels={["오늘의 별자리 운세", "사랑·일·돈", "오늘의 팁"]}>
            {/* 1장: 요약 (공유 이미지로 저장되는 부분) */}
            <div ref={captureRef} className="flex flex-col gap-2 bg-[var(--bg)] pb-1">
              <p className="text-center text-xs text-ink-2">
                {r.sign.symbol} {r.sign.nameKo} · {r.headline}
              </p>
              <Card className="text-left">
                <p className="text-[15px] leading-relaxed">{r.overall}</p>
              </Card>
              <MockNotice provider={result.provider} />
            </div>

            {/* 2장: 분야별 */}
            <div className="flex flex-col gap-2.5">
              {[
                ["💘", "사랑", r.love],
                ["💼", "일", r.work],
                ["💰", "돈", r.money],
              ].map(([e, t, v]) => (
                <Card key={t} className="!py-3.5">
                  <p className="text-[13px] font-semibold text-accent">
                    {e} {t}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed">{v}</p>
                </Card>
              ))}
            </div>

            {/* 3장: 팁 */}
            <div className="flex flex-col gap-3">
              <Card>
                <p className="text-[15px]">💡 {r.tip}</p>
              </Card>
              <button className="mx-auto text-xs text-ink-2 underline underline-offset-4" onClick={() => load(true)} disabled={busy}>
                {busy ? "다시 보는 중…" : "다시 받기"}
              </button>
              <Disclaimer className="pb-2" />
            </div>
          </Pager>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      // 위: 별빛 정원의 복이 / 아래: 별자리 고르기
      scene={
        <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(0.5rem,3dvh,2rem)] text-center">
          <p className="shrink-0 text-[clamp(15px,2.4dvh,18px)] font-semibold text-ink">오늘 별들이 전하는 이야기</p>
          <h1 className="text-gradient mt-1 shrink-0 text-[clamp(28px,4.6dvh,36px)] font-extrabold">별자리 운세</h1>
          <FitCharacter pose="star" min={70} max={240} className="w-full items-end" />
        </div>
      }
      footer={
        <>
          <ErrorBox message={error} />
          <Button size="lg" className="w-full" disabled={!selected} loading={busy} onClick={() => load(false)}>
            {busy ? "별을 읽는 중…" : "오늘의 별자리 운세 보기"}
          </Button>
        </>
      }
    >
      <p className="shrink-0 text-center text-xs text-ink-2">{profileSignId ? "프로필 생일 기준으로 골라 뒀어요. 다른 별자리도 볼 수 있어요" : "내 별자리를 골라 주세요"}</p>
      <div className="mt-2 grid w-full shrink-0 grid-cols-4 gap-2">
        {signs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelected(s.id)}
            aria-pressed={selected === s.id}
            className={`flex flex-col items-center rounded-[16px] py-[clamp(0.3rem,1dvh,0.6rem)] transition active:scale-95 ${selected === s.id ? "bg-white ring-2 ring-accent" : "bg-tile"}`}
          >
            <span className="text-[20px] leading-none text-accent">{s.symbol}</span>
            <span className="mt-0.5 text-[12px] font-semibold">{s.nameKo}</span>
            <span className="text-[9px] text-ink-2">{s.range}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
