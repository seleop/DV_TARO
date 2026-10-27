"use client";

import { useEffect, useRef, useState } from "react";
import { useMascotName } from "@/components/MascotName";
import { HomeButton } from "@/components/app/HomeButton";
import { FitCharacter, Pager, Screen } from "@/components/app/Screen";
import { SafeForm } from "@/components/SafeForm";
import { ShareBar } from "@/components/ShareBar";
import { Button, Card, Disclaimer, ErrorBox, MockNotice } from "@/components/ui";
import { moodFromTarot } from "@/lib/character";
import { api, errorText } from "@/lib/client";
import { josa } from "@/lib/josa";
import { TarotCardBack, TarotCardFace } from "@/components/tarot/TarotCardArt";

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

/** 뒤집히는 카드 한 장: 뒷면(달·별 문장) → 앞면(금테 카드 그림). 그림은 배경 성소의 카드와 같은 그림체 */
function FlipCard({ card, flipped, delay }: { card: Drawn | null; flipped: boolean; delay: number }) {
  return (
    <div className="flip aspect-[3/5] w-full">
      <div className={`flip-inner h-full w-full ${flipped ? "is-flipped" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
        {/* 그림자는 box-shadow (뒤집는 동안 filter 를 쓰면 매 프레임 다시 그려 무겁다) */}
        <div className="flip-face rounded-[10%/6%] shadow-[0_10px_22px_-10px_rgba(255,206,130,0.55)]">
          <TarotCardBack className="h-full w-full" />
        </div>
        <div className="flip-face flip-back rounded-[10%/6%] shadow-[0_10px_24px_-8px_rgba(255,206,130,0.7)]">{card && <TarotCardFace card={card} className="h-full w-full" />}</div>
      </div>
    </div>
  );
}

export default function TarotPage() {
  const mascot = useMascotName();
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
            <HomeButton />
            <p className="line-clamp-1 max-w-[calc(100%-6rem)] shrink-0 text-sm text-ink-2 [text-shadow:0_1px_8px_rgba(10,6,40,0.8)]">“{c.question}”</p>
            <h1 className="mt-0.5 shrink-0 text-[clamp(20px,3.2dvh,24px)] font-extrabold text-ink [text-shadow:0_2px_10px_rgba(10,6,40,0.75)]">카드가 답했어요</h1>
            <CardTable n={c.drawn.length}
              mascot={<FitCharacter pose="tarot" mood={moodFromTarot(c.drawn)} min={64} max={170} className="w-full items-end" />}
              cards={c.drawn.map((d, i) => (
                <figure key={d.id} className="flex min-w-0 flex-1 flex-col items-center">
                  <figcaption className="flex min-h-[2.3em] items-end justify-center text-center text-[10.5px] font-medium leading-tight text-ink-2 [text-shadow:0_1px_6px_rgba(10,6,40,0.9)]">{d.position}</figcaption>
                  <div className="mt-1 w-full">
                    <FlipCard card={d} flipped={flipped} delay={i * 250} />
                  </div>
                  {/* 카드 이름은 뒤집힌 뒤에 나타난다 */}
                  <p
                    className={`mt-1.5 min-h-[2.4em] text-center text-[11px] font-bold leading-tight text-ink transition-opacity duration-500 [text-shadow:0_1px_6px_rgba(10,6,40,0.9)] motion-reduce:transition-none ${flipped ? "opacity-100" : "opacity-0"}`}
                    style={{ transitionDelay: `${i * 250 + 450}ms` }}
                  >
                    {d.nameKo}
                    {d.reversed && <span className="block text-[9.5px] font-medium text-ink-2">역방향</span>}
                  </p>
                </figure>
              ))}
            />
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
            <HomeButton />
            <h1 className="text-gradient shrink-0 text-[clamp(28px,4.6dvh,36px)] font-extrabold [filter:drop-shadow(0_2px_10px_rgba(10,6,40,0.7))]">타로</h1>
            <p className="mt-1 shrink-0 text-[clamp(13px,2.1dvh,15px)] font-medium leading-snug text-ink-2 [text-shadow:0_1px_8px_rgba(10,6,40,0.85)]">
              질문을 떠올리면 {josa(mascot, "이/가")} 카드를 펼쳐 줄게요
            </p>
            {busy ? (
              // 섞는 동안: 별이가 카드를 뽑고(등장 동작), 옆에 뒷면 카드가 떠 있다. 결과가 오면 같은 자리에서 뒤집힌다
              <CardTable n={n}
                mascot={<FitCharacter pose="tarot" min={64} max={170} className="w-full items-end" />}
                cards={Array.from({ length: n }, (_, i) => (
                  <div key={i} className="min-w-0 flex-1 animate-float pb-[calc(2.6em+6px)] pt-[2.3em] text-[10.5px]" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="mt-1">
                      <FlipCard card={null} flipped={false} delay={0} />
                    </div>
                  </div>
                ))}
              />
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

/**
 * 카드 탁자: 왼쪽에 별이, 오른쪽에 카드 줄. 섞는 중·결과가 같은 배치라 카드가 제자리에서 뒤집힌다.
 * 별이 자리는 줄 높이를 다 쓴다(self-stretch) — 높이가 0이면 FitSize 가 별이를 그리지 않는다
 */
function CardTable({ n, mascot, cards }: { n: number; mascot: React.ReactNode; cards: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-2 pb-1">
      <div className="flex min-h-0 w-[36%] max-w-[170px] shrink-0 self-stretch">{mascot}</div>
      <div className={`flex shrink-0 items-start gap-2 ${n === 1 ? "w-[min(5.5rem,13dvh)]" : "w-[min(58%,calc(30dvh+16px))]"}`}>{cards}</div>
    </div>
  );
}
