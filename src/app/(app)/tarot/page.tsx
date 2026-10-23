"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/config/brand";
import { FitCharacter, Pager, Screen } from "@/components/app/Screen";
import { SafeForm } from "@/components/SafeForm";
import { ShareBar } from "@/components/ShareBar";
import { Button, Card, Disclaimer, ErrorBox, MockNotice } from "@/components/ui";
import { moodFromTarot } from "@/lib/character";
import { api, errorText } from "@/lib/client";
import { josa } from "@/lib/josa";

type Drawn = { id: string; position: string; nameKo: string; nameEn: string; reversed: boolean; keywords: string[] };
type Result = {
  id: string;
  provider: string;
  content: { overall: string; cards: Array<{ position: string; cardName: string; interpretation: string }>; advice: string; disclaimer: string; drawn: Drawn[]; question: string };
};

const SPREADS = [
  { id: "one", label: "원 카드", desc: "오늘의 메시지", n: 1 },
  { id: "three", label: "쓰리 카드", desc: "과거·현재·미래", n: 3 },
  { id: "choice", label: "선택", desc: "A·B·조언", n: 3 },
] as const;

function TarotCard({ card, flipped, delay }: { card: Drawn | null; flipped: boolean; delay: number }) {
  return (
    <div className="flip aspect-[2/3] w-full">
      <div className={`flip-inner h-full w-full ${flipped ? "is-flipped" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
        {/* 뒷면 */}
        <div className="flip-face flex items-center justify-center rounded-2xl border border-white/20 bg-[linear-gradient(135deg,#3b2b7a,#1d1650)] shadow-xl">
          <div className="flex h-[86%] w-[82%] items-center justify-center rounded-xl border border-[#c9b3ff]/40">
            <span className="text-3xl text-[#c9b3ff]/80">✦</span>
          </div>
        </div>
        {/* 앞면 */}
        <div className="flip-face flip-back flex flex-col items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#f5f0ff,#d9ccff)] p-2 text-center text-[#2a2440] shadow-xl">
          {card && (
            <>
              <span className="text-[10px] text-[#6b5fa0]">{card.position}</span>
              <span className={`my-2 text-3xl ${card.reversed ? "rotate-180" : ""}`} aria-hidden>
                ✦
              </span>
              <span className="text-[13px] font-bold leading-tight">{card.nameKo}</span>
              <span className="mt-0.5 text-[9px] text-[#6b5fa0]">{card.nameEn}</span>
              {card.reversed && <span className="mt-1 rounded-full bg-[#2a2440]/10 px-2 text-[10px]">역방향</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TarotPage() {
  const [spread, setSpread] = useState<(typeof SPREADS)[number]["id"]>("three");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [flipped, setFlipped] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const n = SPREADS.find((s) => s.id === spread)!.n;

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setFlipped(true), 250);
    return () => clearTimeout(t);
  }, [result]);

  async function draw(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFlipped(false);
    setResult(null);
    try {
      setResult(await api<Result>("/api/tarot", { body: { question, spread } }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const c = result.content;
    return (
      <Screen
        footer={<ShareBar targetRef={captureRef} fileName="타로" shareTitle={`타로 · ${c.question}`} shareText={`${c.drawn.map((d) => d.nameKo).join(", ")}\n${c.overall}`} />}
      >
        <Pager labels={["카드 요약", ...c.drawn.map((d) => d.position), "조언"]}>
          {/* 1장: 질문·카드·총평 (공유 이미지로 저장되는 부분) */}
          <div ref={captureRef} className="flex min-h-0 flex-1 flex-col pb-2 pt-[clamp(0.5rem,3dvh,2rem)] text-center">
            <p className="shrink-0 text-sm text-ink-2">“{c.question}”</p>
            <h1 className="mt-1 shrink-0 text-[clamp(20px,3.2dvh,24px)] font-bold">카드가 답했어요</h1>
            <div
              className={`mx-auto mt-3 grid shrink-0 gap-3 ${c.drawn.length === 1 ? "w-[min(9rem,15dvh)] grid-cols-1" : "w-[min(100%,calc(44dvh+24px))] grid-cols-3"}`}
            >
              {c.drawn.map((d, i) => (
                <TarotCard key={d.id} card={d} flipped={flipped} delay={i * 250} />
              ))}
            </div>
            <FitCharacter pose="tarot" mood={moodFromTarot(c.drawn)} orbs={false} min={70} max={170} className="w-full" />
            <Card className="shrink-0 text-left">
              <p className="text-[15px] leading-relaxed">{c.overall}</p>
            </Card>
            <MockNotice provider={result.provider} />
          </div>

          {/* 카드별 해석: 한 장에 한 카드 */}
          {c.drawn.map((d) => (
            <div key={d.id} className="flex flex-col gap-3 pt-4">
              <div className="mx-auto w-[min(8rem,22dvh)]">
                <TarotCard card={d} flipped delay={0} />
              </div>
              <Card>
                <p className="text-xs text-accent">{d.position}</p>
                <p className="mt-0.5 font-semibold">
                  {d.nameKo} {d.reversed && <span className="text-xs text-warn">(역방향)</span>}
                </p>
                <p className="mt-1 text-xs text-ink-2">{d.keywords.join(" · ")}</p>
                <p className="mt-2 text-[15px] leading-relaxed">{c.cards.find((x) => x.position === d.position)?.interpretation}</p>
              </Card>
            </div>
          ))}

          {/* 조언 */}
          <div className="flex flex-col gap-3 pt-4">
            <FitCharacter pose="tarot" mood={moodFromTarot(c.drawn)} orbs={false} min={80} max={180} className="w-full" />
            <Card className="shrink-0">
              <p className="text-[15px] leading-relaxed">💡 {c.advice}</p>
            </Card>
            <button className="mx-auto shrink-0 text-sm text-ink-2 underline underline-offset-4" onClick={() => setResult(null)}>
              새 질문하기
            </button>
            <Disclaimer className="shrink-0 pb-2" />
          </div>
        </Pager>
      </Screen>
    );
  }

  return (
    <SafeForm onSubmit={draw} className="flex min-h-0 flex-1 flex-col">
      <Screen
        footer={
          <>
            <ErrorBox message={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={question.trim().length < 2}>
              {busy ? "카드를 섞는 중…" : "카드 뽑기"}
            </Button>
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(0.75rem,4dvh,2.5rem)] text-center">
          <p className="shrink-0 text-[clamp(16px,2.5dvh,19px)] font-semibold leading-snug">
            마음속 질문을 떠올리면
            <br />
            {josa(BRAND.characterName, "이/가")} 카드를 펼쳐 줄게요
          </p>
          <h1 className="text-gradient mt-1 shrink-0 text-[clamp(28px,4.6dvh,36px)] font-extrabold">타로</h1>

          {busy ? (
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div className="grid w-[min(100%,calc(36dvh+24px))] grid-cols-3 gap-3">
                {Array.from({ length: n }, (_, i) => (
                  <div key={i} className="animate-float" style={{ animationDelay: `${i * 200}ms` }}>
                    <TarotCard card={null} flipped={false} delay={0} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <FitCharacter pose="tarot" min={80} max={210} className="w-full py-1" />
          )}

          <div className="grid w-full shrink-0 grid-cols-3 gap-2.5">
            {SPREADS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSpread(s.id)}
                className={`rounded-[20px] px-2 py-2.5 transition ${spread === s.id ? "bg-white/20 ring-2 ring-accent" : "bg-tile"}`}
              >
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="text-[11px] text-ink-2">{s.desc}</span>
              </button>
            ))}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={2}
            maxLength={300}
            rows={2}
            enterKeyHint="done"
            placeholder="예: 이번 분기 프로젝트는 어떻게 흘러갈까요?"
            className="mt-3 w-full shrink-0 resize-none rounded-[22px] border border-line bg-white/5 px-4 py-3 text-base outline-none placeholder:text-ink-2/60 focus:border-accent"
          />
          <p className="mt-1 w-full shrink-0 text-right text-[11px] text-ink-2">{question.length}/300 · 질문은 암호화되어 내 기록에만 저장돼요</p>
        </div>
      </Screen>
    </SafeForm>
  );
}
