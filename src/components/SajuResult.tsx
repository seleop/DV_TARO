"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BRAND } from "@/config/brand";
import type { SajuReading } from "@/lib/ai/schemas";
import { api, errorText, formatDate } from "@/lib/client";
import { josa } from "@/lib/josa";
import type { SajuView } from "@/lib/views";
import { CharacterStage } from "./Character";
import { ShareBar } from "./ShareBar";
import { BottomActions, Button, Card, Disclaimer, ErrorBox, H2, MockNotice, StatusBadge, TopBar } from "./ui";

const ELEMENT_COLOR: Record<string, string> = { 목: "var(--wood)", 화: "var(--fire)", 토: "var(--earth)", 금: "var(--metal)", 수: "var(--water)" };
const STEM_EL: Record<string, string> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const BRANCH_EL: Record<string, string> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
const FIELD_LABEL: Record<string, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };
const FIELD_STATUS: Record<string, string> = { MATCH: "일치", CONDITIONAL: "조건부", MISMATCH: "불일치", UNVERIFIED: "미확정", NOT_APPLICABLE: "해당 없음" };
const REASON_TEXT: Record<string, string> = {
  INSUFFICIENT_ENGINES: "응답한 계산 엔진이 2개 미만이에요.",
  CORE_MISMATCH: "같은 조건에서 엔진마다 다른 기둥을 냈어요.",
  DAEWOON_MISMATCH: "대운 방향이나 간지가 엔진마다 달라요.",
  TEN_GOD_MISMATCH: "십신 계산이 엔진마다 달라요.",
  CORE_UNVERIFIED: "일부 기둥을 두 개 이상의 엔진으로 확인하지 못했어요.",
  LUNAR_CONVERSION_UNVERIFIED: "음력→양력 변환을 독립적으로 확인하지 못했어요.",
  SETTING_DIFFERENCE: "선택한 자시 처리 방식을 지원하지 않는 엔진이 있어 일부는 한 엔진만 비교했어요.",
  DAEWOON_START_CONVENTION: "대운 시작 나이가 엔진별 계산 방식 차이로 조금 달라요.",
  LUNAR_CALENDAR_SYSTEM_DIFFERENCE: "한국·중국 음력이 다른 날이라 한국천문연구원 기준 날짜를 독립 출처로 확인해 썼어요.",
  BIRTH_TIME_REQUIRED_FOR_BOUNDARY: "태어난 날 안에 절기나 날짜 경계가 있어 출생 시각 없이는 확정할 수 없어요.",
};
const FOCUS = ["성격", "직업", "재물", "연애", "인간관계", "올해 운세"] as const;

type Reading = { id: string; provider: string; model: string; content: SajuReading; createdAt: number } | null;

function PillarCell({ field, view }: { field: "hour" | "day" | "month" | "year"; view: SajuView }) {
  const p = view.canonical.pillars[field];
  const st = view.fields[field].status;
  const tg = view.canonical.stemTenGods;
  const tenGod = field === "day" ? "일간" : field === "hour" ? tg?.hour : tg?.[field];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-center ${field === "day" ? "bg-white/12 ring-1 ring-accent/50" : "bg-white/5"}`}>
      <span className="text-[11px] text-ink-2">{FIELD_LABEL[field]}</span>
      {p ? (
        <>
          <span className="text-[10px] text-ink-2">{tenGod ?? " "}</span>
          <span className="hanja text-[32px] leading-none" style={{ color: ELEMENT_COLOR[STEM_EL[p.ganji[0]]] }}>
            {p.hanja[0]}
          </span>
          <span className="hanja text-[32px] leading-none" style={{ color: ELEMENT_COLOR[BRANCH_EL[p.ganji[1]]] }}>
            {p.hanja[1]}
          </span>
          <span className="text-[13px] font-medium">{p.ganji}</span>
        </>
      ) : (
        <span className="py-7 text-xs text-ink-2">{st === "NOT_APPLICABLE" ? "시간 미상" : "미확정"}</span>
      )}
      {st !== "NOT_APPLICABLE" && (
        <span className={`text-[10px] ${st === "MATCH" ? "text-ok" : st === "CONDITIONAL" ? "text-warn" : "text-bad"}`}>{FIELD_STATUS[st]}</span>
      )}
    </div>
  );
}

export function SajuResult({
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
  const router = useRouter();
  const [reading, setReading] = useState<Reading>(initialReading);
  const [focus, setFocus] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrimary, setIsPrimary] = useState(initialPrimary);
  const readingRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const c = view.canonical;
  const el = c.elements;
  const maxEl = el ? Math.max(1, ...Object.values(el)) : 1;
  const name = view.label ?? displayName;
  const canInterpret = !!c.pillars.day;

  async function generate() {
    setBusy("reading");
    setError(null);
    try {
      const r = await api<{ reading: NonNullable<Reading> }>(`/api/saju/${view.id}/reading`, { body: { focus } });
      setReading(r.reading);
      setTimeout(() => readingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="사주 원국" back="/saju" />

      <div ref={captureRef} className="flex flex-col items-center pt-1 text-center">
        <p className="text-[15px] text-ink-2">{josa(name, "은/는")}</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight">
          {c.pillars.day ? `${c.pillars.day.ganji}(${c.pillars.day.hanja}) 일주` : "일주 미확정"}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          {c.dayMaster ? `일간 ${c.dayMaster.stem}(${c.dayMaster.element})` : ""}
          {c.zodiacAnimal ? ` · ${c.zodiacAnimal}띠` : ""}
        </p>
        <CharacterStage pose="saju" size={170} orbs={false} className="my-1" />
        <div className="grid w-full grid-cols-4 gap-2">
          {(["hour", "day", "month", "year"] as const).map((f) => (
            <PillarCell key={f} field={f} view={view} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <StatusBadge status={view.status} withDesc />
      </div>
      {view.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-white/5 px-4 py-3 text-[13px] text-ink-2">
          {view.reasons.map((r) => (
            <li key={r}>· {REASON_TEXT[r] ?? r}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-center gap-2">
        {isPrimary ? (
          <Link href="/today" className="rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent">
            ☀️ 이 사주로 오늘의 운세 보기
          </Link>
        ) : (
          <Button variant="ghost" size="sm" onClick={makePrimary} loading={busy === "primary"}>
            내 사주로 설정 (오늘의 운세 기준)
          </Button>
        )}
      </div>

      {el && (
        <Card className="mt-5">
          <H2 sub={c.elementsBasis}>오행 분포</H2>
          <div className="space-y-2.5">
            {Object.entries(el).map(([k, n]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-5 font-semibold" style={{ color: ELEMENT_COLOR[k] }}>
                  {k}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(n / maxEl) * 100}%`, background: ELEMENT_COLOR[k] }} />
                </div>
                <span className="w-5 text-right tabular-nums">{n}</span>
              </div>
            ))}
          </div>
          {c.interpretiveReference.length > 0 && (
            <p className="mt-3 text-[11px] text-ink-2">
              참고(해석 체계에 따라 다름): {c.interpretiveReference.map((r) => `신강약 ${r.strength ?? "-"}, 용신 ${r.yongsin ?? "-"}`).join(" / ")}
            </p>
          )}
        </Card>
      )}

      <Card className="mt-3">
        <H2 sub={c.daewoon ? `${c.daewoon.forward ? "순행" : "역행"} · 시작 ${c.daewoon.startText}` : undefined}>대운</H2>
        {c.daewoon ? (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {c.daewoon.pillars.map((p, i) => (
              <div key={i} className="min-w-[58px] rounded-2xl bg-white/7 px-3 py-2.5 text-center">
                <div className="text-[10px] text-ink-2">{i + 1}번째</div>
                <div className="mt-0.5 font-semibold">{p}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-2">{view.daewoon.note ?? "대운을 표시할 수 없어요."}</p>
        )}
      </Card>

      <div ref={readingRef} className="scroll-mt-16" />
      <Card className="mt-3">
        <H2 sub="검증을 통과한 데이터만 AI에 전달해요. 생년월일·이름은 보내지 않아요.">AI 해석</H2>
        <MockNotice provider={reading?.provider ?? aiProvider} />
        {!canInterpret && <p className="text-sm text-bad">일주가 확정되지 않아 AI 해석을 만들 수 없어요.</p>}
        <p className="mb-2 mt-3 text-[13px] text-ink-2">더 자세히 보고 싶은 분야 (선택)</p>
        <div className="flex flex-wrap gap-2">
          {FOCUS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFocus((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]))}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${focus.includes(f) ? "bg-white text-[#2a2440]" : "bg-white/8 text-ink-2"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {reading && <ReadingView reading={reading} />}
        {reading && (
          <div className="mt-5">
            <ShareBar
              targetRef={captureRef}
              fileName={`사주-${c.pillars.day?.ganji ?? "원국"}`}
              shareTitle={`${c.pillars.day?.ganji ?? ""} 일주 · ${BRAND.appName}`}
              shareText={reading.content.summary}
            />
          </div>
        )}
      </Card>

      <details className="glass mt-3 rounded-[28px] px-5 py-4 text-sm">
        <summary className="cursor-pointer font-semibold">교차검증 상세</summary>
        <div className="mt-4 space-y-5">
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-[13px]">
              <thead className="text-[11px] text-ink-2">
                <tr>
                  <th className="py-1 pr-2 font-normal">항목</th>
                  {view.engines.map((e) => (
                    <th key={e.id} className="py-1 pr-2 font-normal">
                      {e.id}
                    </th>
                  ))}
                  <th className="py-1 font-normal">판정</th>
                </tr>
              </thead>
              <tbody>
                {(["year", "month", "day", "hour"] as const).map((f) => {
                  const v = view.fields[f];
                  return (
                    <tr key={f} className="border-t border-white/10">
                      <td className="py-1.5 pr-2">{FIELD_LABEL[f]}</td>
                      {view.engines.map((e) => {
                        const ex = v.excluded.find((x) => x.engine === e.id);
                        return (
                          <td key={e.id} className="py-1.5 pr-2">
                            {v.values[e.id] ?? "—"}
                            {ex && <span className="ml-1 text-[10px] text-ink-2">({ex.reason === "SETTING_UNSUPPORTED" ? "미지원" : ex.reason === "TIME_UNKNOWN" ? "시간 미상" : "제외"})</span>}
                          </td>
                        );
                      })}
                      <td className="py-1.5">{FIELD_STATUS[v.status]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1.5">
            {view.engines.map((e) => (
              <li key={e.id}>
                <span className={e.ok ? "text-ok" : "text-bad"}>{e.ok ? "●" : "○"}</span> {e.name} {e.version} ({e.license}) — {e.ok ? `${e.durationMs}ms` : `실패: ${e.errorCode}`}
              </li>
            ))}
          </ul>
          {view.time && (
            <p className="text-ink-2">
              절기 판정 시각 {fmtWall(view.time.termTime)} · 일·시주 판정 시각 {fmtWall(view.time.pillarTime)}
              {view.time.correctionMinutes ? ` (보정 ${view.time.correctionMinutes}분)` : ""}
              {view.time.notes.map((n) => ` · ${n}`).join("")}
            </p>
          )}
          {view.lunar && (
            <p className="text-ink-2">
              음력 변환: 한국천문연구원 {view.lunar.candidates.kasi ?? "없음"} / 중국 음력 {view.lunar.candidates.chinese ?? "없음"} — {view.lunar.notes.join(" ")}
            </p>
          )}
          {view.resolutionLog.length > 0 && <p className="text-ink-2">{view.resolutionLog.join(" · ")}</p>}
          <p className="text-[11px] text-ink-2">
            판정 규칙 {view.rulesVersion} · {view.attributions.join(" · ")}
          </p>
        </div>
      </details>

      <button onClick={remove} disabled={busy === "delete"} className="mx-auto mt-5 text-sm text-bad/80 underline underline-offset-4">
        이 기록 삭제
      </button>
      <Disclaimer className="mt-4" />

      <BottomActions>
        <div className="space-y-2">
          <ErrorBox message={error} />
          <Button size="lg" className="w-full" onClick={generate} loading={busy === "reading"} disabled={!canInterpret || !!busy}>
            {busy === "reading" ? `${josa(BRAND.characterName, "이/가")} 풀이하는 중…` : reading ? "AI 해석 다시 받기" : "AI 해석 받기"}
          </Button>
        </div>
      </BottomActions>
    </div>
  );
}

function fmtWall(w: { year: number; month: number; day: number; hour: number; minute: number }) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${p(w.month)}-${p(w.day)} ${p(w.hour)}:${p(w.minute)}`;
}

function ReadingView({ reading }: { reading: NonNullable<Reading> }) {
  const r = reading.content;
  const block = (emoji: string, title: string, text: string) => (
    <section className="rounded-2xl bg-white/5 p-4">
      <h3 className="mb-1.5 font-semibold">
        <span aria-hidden>{emoji}</span> {title}
      </h3>
      <p className="whitespace-pre-line leading-relaxed text-ink/90">{text}</p>
    </section>
  );
  return (
    <article className="mt-5 space-y-3 text-[15px]">
      <p className="text-[11px] text-ink-2">
        {formatDate(reading.createdAt)} · {reading.model}
      </p>
      <p className="rounded-2xl bg-gradient-to-br from-[#8b5cf6]/30 to-[#4f7cf0]/20 p-4 text-[16px] leading-relaxed">{r.summary}</p>
      {block("🌙", "성격", r.personality)}
      <div className="grid grid-cols-1 gap-3">
        <section className="rounded-2xl bg-white/5 p-4">
          <h3 className="mb-1.5 font-semibold">💪 강점</h3>
          <ul className="space-y-1">
            {r.strengths.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white/5 p-4">
          <h3 className="mb-1.5 font-semibold">⚠️ 주의할 점</h3>
          <ul className="space-y-1">
            {r.cautions.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </section>
      </div>
      {block("💼", "직업·일", r.career)}
      {block("💰", "재물", r.wealth)}
      {block("💘", "연애·인간관계", r.relationships)}
      {block("🗓️", `${r.yearlyOutlook.year}년${r.yearlyOutlook.yearGanji ? ` (${r.yearlyOutlook.yearGanji}년)` : ""} 흐름`, r.yearlyOutlook.text)}
      <details className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-ink-2">
        <summary className="cursor-pointer">해석 근거와 한계</summary>
        <ul className="mt-2 space-y-1">
          {r.evidence.map((e, i) => (
            <li key={i}>
              <b className="text-ink">{e.claim}</b> — {e.basis}
            </li>
          ))}
          {r.limitations.map((s, i) => (
            <li key={`l${i}`}>· {s}</li>
          ))}
        </ul>
      </details>
      <p className="text-[11px] text-ink-2">{r.disclaimer}</p>
    </article>
  );
}
