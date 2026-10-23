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
        // 위: 천막 안 탁자에 펼친 카드 / 아래: 카드 풀이 (좌우로 넘김)
        scene={
          <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3rem,7dvh,4.25rem)] text-center">
            <p className="shrink-0 text-sm text-ink-2">“{c.question}”</p>
            <h1 className="mt-0.5 shrink-0 text-[clamp(20px,3.2dvh,24px)] font-extrabold text-ink">카드가 답했어요</h1>
            <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1">
              <FitCharacter pose="tarot" mood={moodFromTarot(c.drawn)} min={70} max={180} className="max-w-[40%] items-end" />
              <div className={`mb-2 grid shrink-0 gap-2 ${c.drawn.length === 1 ? "w-[min(6rem,12dvh)] grid-cols-1" : "w-[min(58%,calc(32dvh+16px))] grid-cols-3"}`}>
                {c.drawn.map((d, i) => (
                  <TarotCard key={d.id} card={d} flipped={flipped} delay={i * 250} />
                ))}
              </div>
            </div>
          </div>
        }
        footer={<ShareBar targetRef={captureRef} fileName="타로" shareTitle={`타로 · ${c.question}`} shareText={`${c.drawn.map((d) => d.nameKo).join(", ")}
${c.overall}`} />}
      >
        <div className="flex h-[min(42dvh,320px)] flex-col">
          <Pager labels={["총평", ...c.drawn.map((d) => d.position), "조언"]}>
            {/* 1장: 총평 (공유 이미지로 저장되는 부분) */}
            <div ref={captureRef} className="flex flex-col gap-2 bg-[var(--bg)] pb-1">
              <p className="text-center text-xs text-ink-2">
                {c.drawn.map((d) => `${d.nameKo}${d.reversed ? "(역)" : ""}`).join(" · ")}
              </p>
              <Card className="text-left">
                <p className="text-[15px] leading-relaxed">{c.overall}</p>
              </Card>
              <MockNotice provider={result.provider} />
            </div>

            {/* 카드별 해석: 한 장에 한 카드 */}
            {c.drawn.map((d) => (
              <Card key={d.id}>
                <p className="text-xs text-accent">{d.position}</p>
                <p className="mt-0.5 font-semibold">
                  {d.nameKo} {d.reversed && <span className="text-xs text-warn">(역방향)</span>}
                </p>
                <p className="mt-1 text-xs text-ink-2">{d.keywords.join(" · ")}</p>
                <p className="mt-2 text-[15px] leading-relaxed">{c.cards.find((x) => x.position === d.position)?.interpretation}</p>
              </Card>
            ))}

            {/* 조언 */}
            <div className="flex flex-col gap-3">
              <Card>
                <p className="text-[15px] leading-relaxed">💡 {c.advice}</p>
              </Card>
              <button className="mx-auto text-sm text-ink-2 underline underline-offset-4" onClick={() => setResult(null)}>
                새 질문하기
              </button>
              <Disclaimer className="pb-2" />
            </div>
          </Pager>
        </div>
      </Screen>
    );
  }

  return (
    <SafeForm onSubmit={draw} className="flex min-h-0 flex-1 flex-col">
      <Screen
        // 위: 천막 안에서 카드를 든 별이 / 아래: 펼치는 방식·질문 입력
        scene={
          <div className="flex min-h-0 flex-1 flex-col items-center pt-[clamp(3.25rem,8dvh,4.75rem)] text-center">
            <p className="shrink-0 text-[clamp(15px,2.4dvh,18px)] font-semibold leading-snug text-ink">
              마음속 질문을 떠올리면 {josa(BRAND.characterName, "이/가")} 카드를 펼쳐 줄게요
            </p>
            <h1 className="text-gradient mt-1 shrink-0 text-[clamp(28px,4.6dvh,36px)] font-extrabold">타로</h1>
            {busy ? (
              <div className="flex min-h-0 w-full flex-1 items-end justify-center pb-4">
                <div className="grid w-[min(100%,calc(30dvh+24px))] grid-cols-3 gap-3">
                  {Array.from({ length: n }, (_, i) => (
                    <div key={i} className="animate-float" style={{ animationDelay: `${i * 200}ms` }}>
                      <TarotCard card={null} flipped={false} delay={0} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <FitCharacter pose="tarot" min={80} max={260} className="w-full items-end" />
            )}
          </div>
        }
        footer={
          <>
            <ErrorBox message={error} />
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={question.trim().length < 2}>
              {busy ? "카드를 섞는 중…" : "카드 뽑기"}
            </Button>
          </>
        }
      >
        <div className="grid w-full shrink-0 grid-cols-3 gap-2.5">
          {SPREADS.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setSpread(s.id)}
              className={`rounded-[20px] px-2 py-2.5 transition ${spread === s.id ? "bg-white ring-2 ring-accent" : "bg-tile"}`}
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
          className="mt-3 w-full shrink-0 resize-none rounded-[22px] border border-line bg-white px-4 py-3 text-base outline-none placeholder:text-ink-2/60 focus:border-accent"
        />
        <p className="mt-1 w-full shrink-0 text-right text-[11px] text-ink-2">{question.length}/300 · 질문은 암호화되어 내 기록에만 저장돼요</p>
      </Screen>
    </SafeForm>
  );
}
