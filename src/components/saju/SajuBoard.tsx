"use client";

import type { SajuView } from "@/lib/views";

export const ELEMENT_COLOR: Record<string, string> = { 목: "var(--wood)", 화: "var(--fire)", 토: "var(--earth)", 금: "var(--metal)", 수: "var(--water)" };
const STEM_EL: Record<string, string> = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const BRANCH_EL: Record<string, string> = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
const LABEL = { hour: "시주", day: "일주", month: "월주", year: "년주" } as const;
/** 전통 표기대로 오른쪽에서 왼쪽: 시·일·월·년 */
const ORDER = ["hour", "day", "month", "year"] as const;

export type Field = (typeof ORDER)[number];
export type Part = "label" | "stem" | "branch" | "tenGod";

/**
 * 원국 판: 네 기둥(천간·지지)을 보여 주고, 글자·기둥 이름·십신을 누르면 onTap 으로 알린다(별이가 풀이).
 * - highlight: 별이가 지금 가리키는 기둥 / selected: 사용자가 누른 칸
 * - 검증 상태는 보여 주지 않는다(2026-10-25 사용자 결정). 확정되지 않은 기둥은 '?', 출생 시각을 모르면 '모름'
 * - revealed: 처음 열 때 기둥이 하나씩 놓이는 연출 (동작 줄이기면 바로)
 */
export function SajuBoard({
  view,
  highlight,
  selected,
  onTap,
  revealed = true,
}: {
  view: SajuView;
  highlight: Field | null;
  selected: { field: Field; part: Part } | null;
  onTap: (field: Field, part: Part) => void;
  revealed?: boolean;
}) {
  const tg = view.canonical.stemTenGods;
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="사주 원국 판">
      {ORDER.map((f, i) => {
        const p = view.canonical.pillars[f];
        const unknownTime = !p && view.fields[f].status === "NOT_APPLICABLE";
        const tenGod = f === "day" ? "일간" : f === "hour" ? (tg?.hour ?? null) : (tg?.[f] ?? null);
        const lit = highlight === f || selected?.field === f;
        const sel = (part: Part) => selected?.field === f && selected.part === part;
        const cell = "w-full rounded-lg transition active:scale-95";
        return (
          <div
            key={f}
            className={`flex flex-col items-center rounded-2xl px-1 pb-2 pt-1.5 transition-all duration-500 ${lit ? "bg-white/15 ring-2 ring-[#c9b3ff]" : "bg-tile"} ${
              revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
            style={{ transitionDelay: revealed ? `${(3 - i) * 160}ms` : "0ms" }}
          >
            <button type="button" onClick={() => onTap(f, "label")} className={`${cell} text-[11px] text-ink-2 ${sel("label") ? "text-ink" : ""}`}>
              {LABEL[f]}
            </button>
            {p ? (
              <>
                <button type="button" onClick={() => tenGod && onTap(f, "tenGod")} disabled={!tenGod} className={`${cell} h-4 text-[10px] text-ink-2 ${sel("tenGod") ? "text-ink" : ""}`}>
                  {tenGod ?? ""}
                </button>
                <button
                  type="button"
                  onClick={() => onTap(f, "stem")}
                  aria-label={`${LABEL[f]} 천간 ${p.ganji[0]}`}
                  className={`${cell} hanja py-0.5 text-[clamp(24px,4.4dvh,32px)] leading-tight ${sel("stem") ? "bg-white/20" : ""}`}
                  style={{ color: ELEMENT_COLOR[STEM_EL[p.ganji[0]]] }}
                >
                  {p.hanja[0]}
                </button>
                <button
                  type="button"
                  onClick={() => onTap(f, "branch")}
                  aria-label={`${LABEL[f]} 지지 ${p.ganji[1]}`}
                  className={`${cell} hanja py-0.5 text-[clamp(24px,4.4dvh,32px)] leading-tight ${sel("branch") ? "bg-white/20" : ""}`}
                  style={{ color: ELEMENT_COLOR[BRANCH_EL[p.ganji[1]]] }}
                >
                  {p.hanja[1]}
                </button>
                <span className="text-[12px] font-medium">{p.ganji}</span>
              </>
            ) : (
              <button type="button" onClick={() => onTap(f, "label")} className={`${cell} flex flex-1 flex-col items-center justify-center py-4 text-ink-2`}>
                <span className="text-[26px] leading-none">{unknownTime ? "·" : "?"}</span>
                <span className="mt-2 text-[11px]">{unknownTime ? "모름" : "미정"}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
