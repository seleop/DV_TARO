"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorText } from "@/lib/client";
import { CharacterStage } from "./Character";
import { ShareBar } from "./ShareBar";
import { BottomActions, Button, Card, Disclaimer, ErrorBox, MockNotice, TopBar } from "./ui";

type Sign = { id: string; nameKo: string; symbol: string; element: string; range: string };
type Result = {
  provider: string;
  cached: boolean;
  content: { headline: string; overall: string; love: string; work: string; money: string; tip: string; sign: { nameKo: string; symbol: string; element: string }; date: string };
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
      <div className="flex flex-1 flex-col">
        <TopBar title="별자리 운세" back={null} right={<button onClick={() => setResult(null)} className="text-sm text-ink-2">변경</button>} />
        <div ref={captureRef} className="flex flex-col items-center pb-2 text-center">
          <p className="text-[15px] text-ink-2">
            {r.date} · {r.sign.symbol} {r.sign.nameKo}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight">{r.headline}</h1>
          <CharacterStage pose="star" size={200} orbs={false} className="my-2" />
          <Card className="w-full text-left">
            <p className="text-[15px] leading-relaxed">{r.overall}</p>
          </Card>
        </div>
        <MockNotice provider={result.provider} />
        <div className="mt-3 space-y-3">
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
          <Card>
            <p className="text-[15px]">💡 {r.tip}</p>
          </Card>
        </div>
        <button className="mx-auto mt-4 text-xs text-ink-2 underline underline-offset-4" onClick={() => load(true)} disabled={busy}>
          {busy ? "다시 보는 중…" : "다시 받기"}
        </button>
        <Disclaimer className="mt-4" />
        <BottomActions withTabBar>
          <ShareBar targetRef={captureRef} fileName={`별자리-${r.sign.nameKo}`} shareTitle={`${r.date} ${r.sign.nameKo} 운세`} shareText={`${r.headline}\n${r.overall}`} />
        </BottomActions>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center pt-10 text-center">
      <p className="text-[19px] font-semibold">오늘 별들이 전하는 이야기</p>
      <h1 className="text-gradient mt-2 text-[36px] font-extrabold">별자리 운세</h1>
      <p className="mt-2 text-sm text-ink-2">{profileSignId ? "프로필 생일 기준으로 골라 뒀어요. 다른 별자리도 볼 수 있어요" : "내 별자리를 골라 주세요"}</p>
      <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
        {signs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelected(s.id)}
            aria-pressed={selected === s.id}
            className={`flex flex-col items-center rounded-[20px] py-3 transition active:scale-95 ${selected === s.id ? "bg-white/20 ring-2 ring-accent" : "bg-tile"}`}
          >
            <span className="text-[28px] leading-none text-[#e3d7ff]">{s.symbol}</span>
            <span className="mt-1.5 text-[13px] font-semibold">{s.nameKo}</span>
            <span className="text-[10px] text-ink-2">{s.range}</span>
          </button>
        ))}
      </div>
      <BottomActions withTabBar>
        <div className="space-y-2">
          <ErrorBox message={error} />
          <Button size="lg" className="w-full" disabled={!selected} loading={busy} onClick={() => load(false)}>
            {busy ? "별을 읽는 중…" : "오늘의 별자리 운세 보기"}
          </Button>
        </div>
      </BottomActions>
    </div>
  );
}
