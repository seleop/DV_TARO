"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { inputCls } from "../ui";

const ROW = 40;

/**
 * 목록에서 고르는 휠 (연·월·일, 2026-10-24 사용자 결정: 모두 목록에서 고르기).
 * 위아래로 굴리면 가운데 칸에 멈춘 값이 골라지고(스크롤 스냅), 칸을 눌러도 골라진다. 키보드는 ↑↓로 옮긴다.
 * 휠 안에서만 스크롤되고 화면 전체는 스크롤되지 않는다. 가운데 줄 위아래는 옅게 흐려 휠처럼 보인다.
 */
export function WheelPicker({ values, value, onChange, format = String, label }: { values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, values.indexOf(value));

  // 값이 밖에서 바뀌면(처음·칸 누름·키보드) 그 칸이 가운데 오게 굴린다. 사용자가 굴리는 중이면(이미 그 칸) 건드리지 않는다.
  // 코드가 굴리는 동안(부드러운 스크롤)에는 지나가는 칸으로 값이 바뀌지 않게 스크롤 이벤트를 무시한다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) === index) return;
    const smooth = el.dataset.ready === "1";
    el.dataset.auto = "1";
    el.scrollTo({ top: index * ROW, behavior: smooth ? "smooth" : "auto" });
    el.dataset.ready = "1";
    const t = setTimeout(() => delete el.dataset.auto, smooth ? 450 : 50);
    return () => clearTimeout(t);
  }, [index]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.dataset.auto) return;
    const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    if (values[i] !== value) onChange(values[i]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const i = Math.min(values.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)));
    onChange(values[i]);
  };

  return (
    <div className="relative">
      {/* 가운데(고른 칸) 표시 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 h-10 rounded-xl border border-accent/40 bg-accent/10" />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`wheel-${label}-${value}`}
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="relative h-[120px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-10 outline-none [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-accent/60 [&::-webkit-scrollbar]:hidden"
      >
        {values.map((v) => (
          <button
            key={v}
            id={`wheel-${label}-${v}`}
            type="button"
            role="option"
            aria-selected={v === value}
            tabIndex={-1}
            onClick={() => onChange(v)}
            className={`flex h-10 w-full snap-center items-center justify-center text-[19px] transition-colors ${v === value ? "font-bold text-ink" : "text-ink-2"}`}
          >
            {format(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 큰 버튼 중 하나 고르기 (양력/음력·윤달·성별) */
export function ChoiceButtons<T extends string>({ options, value, onChange, label }: { options: Array<{ value: T; label: string; hint?: string }>; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-3 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[16px] font-semibold transition-colors ${
              on ? "border-accent bg-accent text-white" : "border-line bg-white text-[#2a2440]"
            }`}
          >
            {o.label}
            {o.hint && <span className={`text-[11px] font-normal ${on ? "text-white/80" : "text-ink-2"}`}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** 태어난 시각: 시·분 숫자 입력 + '태어난 시간을 몰라요' */
export function TimeFields({
  hour,
  minute,
  known,
  invalid,
  onHour,
  onMinute,
  onKnown,
  hourRef,
}: {
  hour: string;
  minute: string;
  known: boolean;
  invalid: boolean;
  onHour: (v: string) => void;
  onMinute: (v: string) => void;
  onKnown: (v: boolean) => void;
  hourRef?: React.Ref<HTMLInputElement>;
}) {
  const field = (v: string, set: (v: string) => void, name: string, unit: string, ref?: React.Ref<HTMLInputElement>) => (
    <label className="relative flex-1">
      <span className="sr-only">{unit}</span>
      <input
        ref={ref}
        name={name}
        value={v}
        onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={2}
        disabled={!known}
        placeholder={name === "hour" ? "14" : "30"}
        aria-invalid={invalid && known ? true : undefined}
        aria-describedby={invalid ? "auth-msg" : undefined}
        enterKeyHint="next"
        className={`${inputCls} h-14 pr-10 text-center text-[19px] ${invalid && known ? "border-bad/70!" : ""} ${known ? "" : "opacity-40"}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-ink-2">{unit}</span>
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {field(hour, onHour, "hour", "시", hourRef)}
        {field(minute, onMinute, "minute", "분")}
      </div>
      <button
        type="button"
        aria-pressed={!known}
        onClick={() => onKnown(!known)}
        className={`w-full rounded-xl border px-3 py-2 text-[14px] transition-colors ${known ? "border-line bg-white text-ink-2" : "border-accent bg-accent/15 font-semibold text-accent"}`}
      >
        {known ? "태어난 시간을 몰라요" : "✓ 시간을 몰라요 (시간 없이 볼게요)"}
      </button>
    </div>
  );
}
