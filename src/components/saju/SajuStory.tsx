"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/config/brand";
import { MASCOT_POSTERS } from "@/config/mascot-assets";
import { useMascotName } from "@/components/MascotName";
import type { SajuReading } from "@/lib/ai/schemas";
import { api, errorText } from "@/lib/client";
import { sajuChapters, type Cue } from "@/lib/dialogue";
import { josa } from "@/lib/josa";
import { currentDaewoonIndex, ELEMENT_FAMILY, explainBranch, explainPillar, explainStem, explainTenGod } from "@/lib/saju-glossary";
import type { SajuView } from "@/lib/views";
import { FitSize, Screen } from "../app/Screen";
import { SpeechBubble, CHAR_MS } from "../auth/SpeechBubble";
import { ShareBar } from "../ShareBar";
import { Button, Disclaimer, ErrorBox, TopBar } from "../ui";
import { ELEMENT_COLOR, SajuBoard, type Field, type Part } from "./SajuBoard";
import { SajuMascot } from "./SajuMascot";

type Reading = { id: string; provider: string; model: string; content: SajuReading; createdAt: number } | null;
type Line = { key: string; text: string; cue: Cue | null };
type Chapter = { id: string; title: string; beats: NonNullable<SajuReading["dialogue"]>["beats"] };

const ASK: Chapter = { id: "ask", title: "더 물어보기", beats: [] };

/** 말풍선 글자가 다 나오는 데 걸리는 시간 (SpeechBubble: 튀어나옴 + 글자당 45ms) */
const typingMs = (text: string) => 260 + [...text].length * CHAR_MS + 250;
/** 대사 열쇠 → 동작 재생 번호 (같은 대사면 같은 번호) */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

/**
 * 대화형 사주 결과 ('별이의 해설석', 2026-10-25 사용자 결정).
 * 위: 한옥 서재에서 별이가 한 마디씩 말한다(말풍선 + 대사마다 동작). 아래: 그 대사가 가리키는 판·카드.
 * - 해석 전: 원국 판이 놓이고, 글자를 누르면 별이가 뜻을 알려 준다(미리 써 둔 풀이). '풀이 듣기'로 AI 해석을 받는다
 * - 해석 후: 장(원국 → 타고난 나 → 일과 재물 → 사람 → 흐름 → 더 물어보기)을 대사 단위로 넘긴다
 * - 더 물어보기: 결과 맞춤 추천 질문 3개(답은 해석과 함께 미리 받아 둠 → 추가 AI 호출 없음), 공유 카드, 다른 메뉴로
 * - 교차검증 상태는 보여 주지 않는다(2026-10-25 사용자 결정)
 */
export function SajuStory({
  view,
  initialReading,
  aiProvider,
  isPrimary: initialPrimary,
  displayName,
}: {
  view: SajuView;
  initialReading: Reading;
  aiProvider: string;
  isPrimary: boolean;
  displayName: string;
}) {
  const mascot = useMascotName();
  const router = useRouter();
  const [reading, setReading] = useState<Reading>(initialReading);
  const [chapter, setChapter] = useState(0);
  const [beat, setBeat] = useState(0);
  const [aside, setAside] = useState<Line | null>(null);
  const [selected, setSelected] = useState<{ field: Field; part: Part } | null>(null);
  const [asked, setAsked] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | "reading" | "primary" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(initialPrimary);
  const [menu, setMenu] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  /** 같은 칸·질문을 다시 눌러도 새 대사로 보이게 붙이는 번호 */
  const seq = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const c = view.canonical;
  const name = view.label ?? displayName;
  const canInterpret = !!c.pillars.day;
  const r = reading?.content ?? null;
  const chapters: Chapter[] = r?.dialogue ? [...sajuChapters(r.dialogue), ASK] : [];
  const ch = chapters[chapter] ?? null;
  const curBeat = ch?.beats[beat] ?? null;

  // 지금 말풍선에 보일 대사
  let line: Line;
  if (aside) line = aside;
  else if (!r) {
    line = !canInterpret
      ? { key: "no-day", text: "일주가 정해지지 않아서 풀이는 어려워. 그래도 놓인 글자를 누르면 뜻은 알려 줄게.", cue: "comfort" }
      : busy === "reading"
        ? { key: "loading", text: "책장을 넘기며 읽고 있어… 조금만 기다려 줘.", cue: "anticipate" }
        : { key: "intro", text: `${name}의 사주책을 펼쳤어. 네 기둥이 놓였지? 글자를 눌러 보면 뜻을 알려 줄게.`, cue: "greet" };
  } else if (ch?.id === "ask") line = { key: "ask", text: `${r.dialogue!.closing}\n더 궁금한 걸 골라 봐.`, cue: "nod" };
  else line = { key: `b-${chapter}-${beat}`, text: curBeat?.say ?? "", cue: curBeat?.cue ?? null };

  const typing = doneKey !== line.key;
  useEffect(() => {
    const t = setTimeout(() => setDoneKey(line.key), typingMs(line.text));
    return () => clearTimeout(t);
  }, [line.key, line.text]);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, []);

  function clearAside() {
    setAside(null);
    setSelected(null);
    setAsked(null);
  }
  const last = chapters.length - 1;
  const atStart = chapter === 0 && beat === 0;
  const atEnd = chapter === last;
  function next() {
    clearAside();
    if (!ch) return;
    if (beat < ch.beats.length - 1) setBeat(beat + 1);
    else if (chapter < last) {
      setChapter(chapter + 1);
      setBeat(0);
    }
  }
  function prev() {
    clearAside();
    if (beat > 0) setBeat(beat - 1);
    else if (chapter > 0) {
      setChapter(chapter - 1);
      setBeat(Math.max(0, chapters[chapter - 1].beats.length - 1));
    }
  }
  function jump(i: number) {
    clearAside();
    setChapter(i);
    setBeat(0);
    setMenu(false);
  }

  /** 원국 판 짚기: 미리 써 둔 풀이를 별이가 말한다 */
  function tap(field: Field, part: Part) {
    const p = c.pillars[field];
    let text: string | null = null;
    if (part === "stem" && p) text = explainStem(p.ganji[0], field === "day");
    else if (part === "branch" && p) text = explainBranch(p.ganji[1]);
    else if (part === "tenGod") {
      const tg = field === "day" ? null : field === "hour" ? c.stemTenGods?.hour : c.stemTenGods?.[field];
      text = field === "day" ? "일간은 사주의 주인공, 바로 너 자신이야. 다른 글자는 모두 일간과의 관계로 읽어." : tg ? explainTenGod(tg) : null;
    } else text = explainPillar(field, p ? null : view.fields[field].status === "NOT_APPLICABLE" ? "unknown-time" : "unresolved");
    if (!text) return;
    setSelected({ field, part });
    setAsked(null);
    setAside({ key: `g-${field}-${part}-${++seq.current}`, text, cue: "point" });
  }

  function ask(i: number) {
    const s = r?.dialogue?.suggestions[i];
    if (!s) return;
    setAsked(i);
    setAside({ key: `s-${i}-${++seq.current}`, text: s.answer, cue: "listen" });
  }

  async function generate() {
    setBusy("reading");
    setError(null);
    setMenu(false);
    clearAside();
    try {
      const res = await api<{ reading: NonNullable<Reading> }>(`/api/saju/${view.id}/reading`, { body: { focus: [] } });
      setReading(res.reading);
      setChapter(0);
      setBeat(0);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function makePrimary() {
    setBusy("primary");
    try {
      await api(`/api/saju/${view.id}`, { method: "PATCH", body: { primary: true } });
      setIsPrimary(true);
      router.refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("이 사주 기록과 관련 해석을 모두 삭제할까요? 되돌릴 수 없어요.")) return;
    setBusy("delete");
    try {
      await api(`/api/saju/${view.id}`, { method: "DELETE" });
      router.replace("/saju");
      router.refresh();
    } catch (e) {
      setError(errorText(e));
      setBusy(null);
    }
  }

  // ── 아래 판: 대사가 가리키는 것 ──
  const focus = curBeat?.focus;
  let stage: React.ReactNode;
  if (!r || ch?.id === "chart") {
    stage =
      focus === "elements" && !aside ? (
        <ElementsCard elements={c.elements} />
      ) : (
        <SajuBoard view={view} highlight={aside ? null : (curBeat?.pillar ?? null)} selected={selected} onTap={tap} revealed={revealed} />
      );
  } else if (ch?.id === "self") {
    stage =
      focus === "personality" ? (
        <TextCard title="성격" text={r.personality} />
      ) : (
        <TraitsCard strengths={r.strengths} cautions={r.cautions} active={focus === "cautions" ? "cautions" : "strengths"} />
      );
  } else if (ch?.id === "work") {
    stage = focus === "wealth" ? <TextCard title="재물" text={r.wealth} /> : <TextCard title="직업·일" text={r.career} />;
  } else if (ch?.id === "people") {
    stage = <TextCard title="연애·인간관계" text={r.relationships} />;
  } else if (ch?.id === "flow") {
    stage =
      focus === "daewoon" && c.daewoon ? (
        <DaewoonCard daewoon={c.daewoon} now={currentDaewoonIndex(c.daewoon.startText, view.solarDate, new Date(), c.daewoon.pillars.length)} />
      ) : (
        <TextCard title={`${r.yearlyOutlook.year}년 흐름`} badge={r.yearlyOutlook.yearGanji ? `${r.yearlyOutlook.yearGanji}년` : undefined} text={r.yearlyOutlook.text} />
      );
  } else {
    stage = (
      <div className="flex h-full flex-col gap-2">
        {/* 질문이 길면(최대 40자) 두 줄이 되므로, 목록은 이 칸 안에서만 스크롤해 아래 버튼을 가리지 않게 */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-0.5">
          {r.dialogue!.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ask(i)}
              className={`rounded-2xl px-4 py-2.5 text-left text-[14px] font-semibold transition active:scale-[0.98] ${asked === i ? "bg-white/20 ring-2 ring-[#c9b3ff]" : "bg-tile"}`}
            >
              <span aria-hidden className="mr-1.5 text-[#c9b3ff]">
                ✦
              </span>
              {s.question}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 justify-center gap-2 text-[13px]">
          <button type="button" onClick={prev} aria-label="이전 이야기" className="rounded-full bg-tile px-3 py-1.5 font-semibold">
            ‹
          </button>
          {isPrimary ? (
            <Link href="/today" className="rounded-full bg-tile px-3.5 py-1.5 font-semibold">
              ☀️ 오늘의 운세 보기
            </Link>
          ) : (
            <button type="button" onClick={makePrimary} disabled={!!busy} className="rounded-full bg-tile px-3.5 py-1.5 font-semibold">
              {busy === "primary" ? "설정하는 중…" : "내 사주로 설정"}
            </button>
          )}
          <Link href="/saju/new" className="rounded-full bg-tile px-3.5 py-1.5 font-semibold">
            다른 사람 사주
          </Link>
        </div>
      </div>
    );
  }

  /** 좌우로 밀어 이야기 넘기기 (가로로 충분히, 세로보다 크게 움직였을 때만. 세로 스크롤은 그대로) */
  function onSwipeEnd(e: React.PointerEvent) {
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s || !r || menu) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !atEnd) next();
    else if (dx > 0 && !atStart) prev();
  }

  const title = ch?.title ?? "사주 원국";
  return (
    <div
      className="flex min-h-0 flex-1 touch-pan-y flex-col"
      onPointerDown={(e) => (swipeStart.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={onSwipeEnd}
      onPointerCancel={() => (swipeStart.current = null)}
    >
      <Screen
        header={
          <TopBar
            back="/saju"
            right={
              <button type="button" onClick={() => setMenu(true)} aria-label="목차와 메뉴" className="flex h-10 w-10 items-center justify-center rounded-full text-[20px] active:bg-white/10">
                ⋯
              </button>
            }
          />
        }
        scene={
          <div className="flex min-h-0 flex-1 flex-col">
            {/* 장 이름: 배경(달·창)이 밝아도 읽히게 반투명 알약 위에, 머리 줄 가운데로 올린다 */}
            <div className="pointer-events-none -mt-[44px] flex h-[44px] shrink-0 flex-col items-center justify-center gap-0.5">
              <h1 className="rounded-full bg-black/40 px-3.5 py-1 text-[14px] font-bold text-white backdrop-blur-sm">{title}</h1>
              {(reading?.provider ?? aiProvider) === "mock" && <p className="rounded-full bg-black/30 px-2 text-[10px] text-white/80">모의 응답 · 실제 AI 해석이 아니에요</p>}
            </div>
            {/* 추천 질문의 답은 최대 400자라, 말풍선이 별이를 밀어내지 않게 높이를 묶고 넘치면 말풍선 안에서만 스크롤 */}
            <div className="max-h-[min(34dvh,200px)] shrink-0 overflow-y-auto overscroll-contain pt-3">
              <SpeechBubble id={line.key} label={mascot} text={line.text} accent={line.key.startsWith("s-")} />
            </div>
            <FitSize min={70} max={210} className="items-end">
              {(size) => <SajuMascot cue={line.cue} cueId={hash(line.key)} typing={typing} size={size} label={`마스코트 ${mascot}`} />}
            </FitSize>
          </div>
        }
        footer={
          <>
            <ErrorBox message={error} />
            {!r ? (
              canInterpret && (
                <Button size="lg" className="w-full" onClick={generate} loading={busy === "reading"} disabled={!!busy}>
                  {busy === "reading" ? `${josa(mascot, "이/가")} 읽는 중…` : `${mascot}에게 풀이 듣기`}
                </Button>
              )
            ) : atEnd ? (
              <ShareBar
                targetRef={shareRef}
                fileName={`사주-${c.pillars.day?.ganji ?? "원국"}`}
                shareTitle={`${c.pillars.day?.ganji ?? ""} 일주 · ${BRAND.appName}`}
                shareText={r.summary}
              />
            ) : (
              <nav className="flex items-center gap-2" aria-label="이야기 넘기기">
                <button type="button" onClick={prev} disabled={atStart} aria-label="이전" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tile text-xl disabled:opacity-30">
                  ‹
                </button>
                <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
                  {chapters.map((x, i) => (
                    <span key={x.id} className={`h-1.5 rounded-full transition-all ${i === chapter ? "w-6 bg-[#c9b3ff]" : "w-1.5 bg-white/30"}`} />
                  ))}
                </div>
                <Button size="lg" onClick={next} className="shrink-0 rounded-full px-6">
                  {beat === ch!.beats.length - 1 ? (chapter === last - 1 ? "물어보기 ›" : `${chapters[chapter + 1].title} ›`) : "다음 ›"}
                </Button>
              </nav>
            )}
          </>
        }
      >
        <div className="h-[clamp(158px,30dvh,236px)] shrink-0 pb-1">{stage}</div>
      </Screen>

      {menu && (
        <div className="fixed inset-0 z-40 mx-auto flex max-w-[440px] flex-col justify-end bg-black/50" onClick={() => setMenu(false)}>
          <div className="glass-night glass-sheet rounded-t-[28px] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5" onClick={(e) => e.stopPropagation()}>
            {chapters.length > 0 && (
              <>
                <p className="mb-2 text-[13px] font-semibold text-ink-2">목차</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {chapters.map((x, i) => (
                    <button key={x.id} type="button" onClick={() => jump(i)} className={`rounded-full px-3.5 py-1.5 text-[14px] ${i === chapter ? "bg-white/20 ring-1 ring-[#c9b3ff]" : "bg-tile"}`}>
                      {i + 1}. {x.title}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="space-y-2">
              {r && (
                <Button variant="ghost" className="w-full" onClick={generate} disabled={!!busy || !canInterpret}>
                  풀이 다시 받기
                </Button>
              )}
              {!isPrimary && (
                <Button variant="ghost" className="w-full" onClick={makePrimary} disabled={!!busy}>
                  내 사주로 설정 (오늘의 운세 기준)
                </Button>
              )}
              <button type="button" onClick={remove} disabled={!!busy} className="mx-auto block py-2 text-sm text-bad/80 underline underline-offset-4">
                이 기록 삭제
              </button>
              <Disclaimer />
            </div>
          </div>
        </div>
      )}

      {/* 공유 카드 (화면 밖에 그려 두고 이미지로 저장). 출생 정보는 넣지 않는다 */}
      <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <ShareCard ref={shareRef} view={view} summary={r?.summary ?? null} />
      </div>
    </div>
  );
}

function TextCard({ title, text, badge }: { title: string; text: string; badge?: string }) {
  return (
    <div className="flex h-full flex-col rounded-[22px] bg-tile px-4 py-3">
      <p className="mb-1.5 flex shrink-0 items-center gap-2 text-[13px] font-semibold text-[#c9b3ff]">
        {title}
        {badge && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-ink">{badge}</span>}
      </p>
      {/* 사주 결과 설명은 스크롤 허용 화면 (CLAUDE.md) — 긴 글은 카드 안에서만 */}
      <p className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{text}</p>
    </div>
  );
}

function TraitsCard({ strengths, cautions, active }: { strengths: string[]; cautions: string[]; active: "strengths" | "cautions" }) {
  const box = (on: boolean) => `min-h-0 flex-1 overflow-y-auto rounded-[22px] px-3.5 py-3 transition ${on ? "bg-white/15 ring-1 ring-[#c9b3ff]" : "bg-tile opacity-70"}`;
  return (
    <div className="flex h-full gap-2">
      <div className={box(active === "strengths")}>
        <p className="mb-1 text-[13px] font-semibold">💪 강점</p>
        <ul className="space-y-1 text-[13px] leading-snug">
          {strengths.map((s, i) => (
            <li key={i}>· {s}</li>
          ))}
        </ul>
      </div>
      <div className={box(active === "cautions")}>
        <p className="mb-1 text-[13px] font-semibold">🌙 조심할 점</p>
        <ul className="space-y-1 text-[13px] leading-snug">
          {cautions.map((s, i) => (
            <li key={i}>· {s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 오행 다섯 식구: 원국 안 오행 개수를 점으로 */
function ElementsCard({ elements }: { elements: Record<string, number> | null }) {
  if (!elements) return <TextCard title="다섯 기운" text="오행을 셀 수 있을 만큼 기둥이 정해지지 않았어요." />;
  return (
    <div className="grid h-full grid-cols-5 gap-1.5">
      {Object.entries(elements).map(([k, n]) => (
        <div key={k} className="flex flex-col items-center justify-end gap-1 rounded-[18px] bg-tile px-1 pb-2 pt-2">
          <div className="flex min-h-0 flex-1 flex-col-reverse items-center gap-1">
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ background: ELEMENT_COLOR[k] }} />
            ))}
          </div>
          <span className="text-[18px] font-bold" style={{ color: ELEMENT_COLOR[k] }}>
            {k}
          </span>
          <span className="text-center text-[10px] leading-tight text-ink-2">{ELEMENT_FAMILY[k].replace(" 식구", "")}</span>
        </div>
      ))}
    </div>
  );
}

/** 대운: 10년씩 이어지는 인생의 계절. 지금 대운을 표시한다 */
function DaewoonCard({ daewoon, now }: { daewoon: { forward: boolean; pillars: string[]; startText: string }; now: number | null }) {
  return (
    <div className="flex h-full flex-col rounded-[22px] bg-tile px-3 py-3">
      <p className="mb-2 text-[13px] font-semibold text-[#c9b3ff]">
        대운 <span className="font-normal text-ink-2">· 10년마다 바뀌는 흐름 · 시작 {daewoon.startText}</span>
      </p>
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {daewoon.pillars.slice(0, 8).map((p, i) => (
          <div key={i} className={`flex flex-col items-center justify-center rounded-xl ${i === now ? "bg-white/20 ring-2 ring-[#c9b3ff]" : "bg-white/5"}`}>
            <span className="text-[15px] font-semibold">{p}</span>
            <span className="text-[10px] text-ink-2">{i === now ? "지금" : `${i + 1}번째`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 공유용 결과 카드 (이미지로 저장). 일주·요약만 — 이름·생년월일·시각·출생지는 넣지 않는다 (docs/DATA_POLICY.md). 이미지 모서리가 남지 않게 네모 */
function ShareCard({ ref, view, summary }: { ref: React.Ref<HTMLDivElement>; view: SajuView; summary: string | null }) {
  const c = view.canonical;
  return (
    <div ref={ref} className="w-[360px] bg-[linear-gradient(160deg,#2a1f5c,#120d36)] p-6 text-center text-white">
      <p className="text-[13px] text-white/70">{BRAND.appName} · 사주</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- 이미지 저장용 카드라 next/image 최적화가 필요 없다 */}
      <img src={MASCOT_POSTERS.saju} alt="" width={96} height={103} className="mx-auto mt-2 h-[103px] w-auto" />
      <p className="hanja mt-1 text-[44px] font-bold leading-none">{c.pillars.day?.hanja ?? "?"}</p>
      <p className="mt-1 text-[20px] font-bold">{c.pillars.day ? `${c.pillars.day.ganji} 일주` : "일주 미정"}</p>
      <p className="mt-1 text-[13px] text-white/70">
        {c.dayMaster ? `일간 ${c.dayMaster.stem}(${c.dayMaster.element})` : ""}
        {c.zodiacAnimal ? ` · ${c.zodiacAnimal}띠` : ""}
      </p>
      {c.elements && (
        <div className="mt-4 flex justify-center gap-3">
          {Object.entries(c.elements).map(([k, n]) => (
            <span key={k} className="text-[14px] font-semibold" style={{ color: ELEMENT_COLOR[k] }}>
              {k} {n}
            </span>
          ))}
        </div>
      )}
      {summary && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-left text-[14px] leading-relaxed">{summary}</p>}
    </div>
  );
}
