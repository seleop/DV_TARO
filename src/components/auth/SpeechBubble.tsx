"use client";

import { useState } from "react";

/** 한 글자가 나타나는 간격(ms, 2026-10-24 사용자 결정) */
export const CHAR_MS = 45;
/** 이전 말풍선이 줄어들며 사라진 뒤 새 말풍선이 튀어나오기까지 */
const POP_DELAY_MS = 140;

const STYLE = `
@keyframes sb-pop { 0% { opacity: 0; transform: scale(0.8); } 60% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
@keyframes sb-out { to { opacity: 0; transform: scale(0.88); } }
@keyframes sb-hop { 0% { opacity: 0; transform: translateY(7px); } 60% { opacity: 1; transform: translateY(-2px); } 100% { opacity: 1; transform: none; } }
.sb-pop { animation: sb-pop 450ms cubic-bezier(.2,.8,.2,1) ${POP_DELAY_MS}ms both; }
.sb-out { animation: sb-out 250ms ease-in forwards; }
.sb-ch { display: inline-block; white-space: pre; animation: sb-hop 350ms ease-out both; }
.sb-skip .sb-ch { animation: none; }
@media (prefers-reduced-motion: reduce) { .sb-pop, .sb-out, .sb-ch { animation: none; } }
`;

type Line = { id: string; label: string; text: string; accent: boolean; out?: boolean };

/**
 * 화자의 말풍선 (2026-10-24 사용자 결정: 시안 4 '통통 팝', 글자당 45ms).
 * - 말이 바뀌면 이전 말풍선은 살짝 줄어들며 사라지고, 새 말풍선이 통 튀어나온다
 * - 글자는 한 글자씩 살짝 튀어 오르며 나타난다 (CSS 애니메이션 지연으로, 매 프레임 렌더링 없음)
 * - 말풍선을 누르면 남은 글자가 바로 다 보인다. 화면 읽기 프로그램에는 문장 전체를 한 번에 읽어 준다
 * - '동작 줄이기' 설정이면 애니메이션 없이 바로 보인다
 * id가 바뀔 때만 새 말로 본다 (같은 id면 글자만 바뀌어도 다시 나타나지 않음).
 */
export function SpeechBubble({ id, label, text, accent = false }: { id: string; label: string; text: string; accent?: boolean }) {
  const [lines, setLines] = useState<Line[]>([{ id, label, text, accent }]);
  const [skipped, setSkipped] = useState<string | null>(null);
  const current = lines[lines.length - 1];
  // 새 말: 지금 말풍선은 사라지는 중으로 두고 새 말풍선을 더한다 (렌더링 중 이전 값과 비교하는 React 권장 방식)
  if (current.id !== id) setLines([{ ...current, out: true }, { id, label, text, accent }]);
  else if (current.text !== text || current.label !== label || current.accent !== accent) setLines([...lines.slice(0, -1), { id, label, text, accent }]);

  return (
    <div className="relative">
      <style>{STYLE}</style>
      {lines.map((l) => (
        <Bubble
          key={l.id}
          line={l}
          skip={skipped === l.id}
          onSkip={() => setSkipped(l.id)}
          onGone={() => setLines((ls) => ls.filter((x) => x.id !== l.id || !x.out))}
        />
      ))}
    </div>
  );
}

function Bubble({ line, skip, onSkip, onGone }: { line: Line; skip: boolean; onSkip: () => void; onGone: () => void }) {
  // 글 속 "\n"은 줄바꿈. 낱말은 줄바꿈 단위로 묶고(낱말 중간에서 줄이 바뀌지 않게), 글자마다 나타나는 시각을 늦춘다 (띄어쓰기·줄바꿈도 한 박자)
  let n = 0;
  const lines = line.text.split("\n").map((row) =>
    row.split(" ").map((w) => {
      const chars = [...w].map((c) => ({ c, delay: POP_DELAY_MS + 120 + n++ * CHAR_MS }));
      n++;
      return chars;
    }),
  );
  return (
    <p
      onClick={onSkip}
      onAnimationEnd={(e) => {
        if (line.out && e.target === e.currentTarget) onGone();
      }}
      className={`bubble-soft origin-bottom-left rounded-2xl px-4 pb-3 pt-4 text-[15px] font-semibold leading-relaxed ${
        line.out ? "sb-out absolute inset-x-0 bottom-0" : "sb-pop relative"
      } ${skip ? "sb-skip" : ""}`}
    >
      <span
        className={`absolute -top-3 left-3 rounded-full border border-white/20 px-2.5 py-0.5 text-[12px] font-extrabold tracking-wider text-white shadow ${line.accent ? "bg-[linear-gradient(135deg,#6a4fd0,#3a3aa8)]" : "bg-[#120d36]"}`}
      >
        {line.label}
      </span>
      {/* 화면 읽기용: 문장 전체 (사라지는 말풍선은 읽지 않음) */}
      {!line.out && (
        <span className="sr-only" aria-live="polite">
          {line.text.replace(/\n/g, " ")}
        </span>
      )}
      <span aria-hidden>
        {lines.map((words, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {words.map((chars, wi) => (
              <span key={wi}>
                <span className="inline-block whitespace-nowrap">
                  {chars.map(({ c, delay }, ci) => (
                    <span key={ci} className="sb-ch" style={{ animationDelay: `${delay}ms` }}>
                      {c}
                    </span>
                  ))}
                </span>
                {/* 띄어쓰기는 보통 글자로 둔다 (줄이 바뀔 때 줄 앞에 빈칸이 남지 않게) */}
                {wi < words.length - 1 && " "}
              </span>
            ))}
          </span>
        ))}
      </span>
    </p>
  );
}
