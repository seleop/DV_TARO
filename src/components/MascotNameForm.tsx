"use client";

import { useState, type FormEvent } from "react";
import { errorText } from "@/lib/client";
import { DEFAULT_MASCOT_NAME, MASCOT_NAME_MAX, MASCOT_NAME_SUGGESTIONS, mascotNameError, normalizeMascotName } from "@/lib/mascot-name";
import { SafeForm } from "./SafeForm";
import { Button, inputCls } from "./ui";

/**
 * 마스코트 이름 짓기 입력 (가입 마무리·홈·프로필 설정 공용).
 * 입력칸 + 눌러서 고르는 추천 이름 + 안내/오류 + [지금 이름 그대로][이 이름으로].
 * onSave/onKeep 이 실패(throw)하면 오류 문구를 보여 주고 다시 누를 수 있게 한다.
 */
export function MascotNameForm({
  initial = "",
  saveLabel,
  keepLabel,
  hint = `${MASCOT_NAME_MAX}자까지 · 나중에 프로필 설정에서 바꿀 수 있어요`,
  onSave,
  onKeep,
}: {
  initial?: string;
  saveLabel: string;
  /** 없으면 "그대로" 버튼을 두지 않는다 (프로필 설정) */
  keepLabel?: string;
  hint?: string;
  onSave: (name: string) => Promise<void>;
  onKeep?: () => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "keep" | null>(null);
  const count = Array.from(normalizeMascotName(value)).length;

  async function run(kind: "save" | "keep") {
    if (busy) return;
    const name = normalizeMascotName(value);
    if (kind === "save") {
      const err = mascotNameError(name);
      if (err) {
        setError(err);
        return;
      }
    }
    setBusy(kind);
    setError(null);
    try {
      await (kind === "save" ? onSave(name) : onKeep?.());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeForm
      noValidate
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void run("save");
      }}
    >
      <label htmlFor="mascot-name" className="sr-only">
        이름
      </label>
      <div className="relative">
        <input
          id="mascot-name"
          name="mascotName"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={`예: ${DEFAULT_MASCOT_NAME}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={MASCOT_NAME_MAX + 8}
          aria-invalid={error ? true : undefined}
          aria-describedby="mascot-name-msg"
          className={`${inputCls} h-14 pr-16 text-[17px] ${error ? "border-bad/70!" : ""}`}
        />
        <span className={`pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] tabular-nums ${count > MASCOT_NAME_MAX ? "text-bad" : "text-ink-2/80"}`} aria-hidden>
          {count}/{MASCOT_NAME_MAX}
        </span>
      </div>
      {/* 추천 이름: 누르면 바로 칸에 들어간다 (키보드 없이도 고를 수 있게) */}
      <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5" role="group" aria-label="추천 이름">
        {MASCOT_NAME_SUGGESTIONS.map((s) => {
          const on = normalizeMascotName(value) === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                setError(null);
              }}
              aria-pressed={on}
              className={`h-9 shrink-0 rounded-full border px-3.5 text-[14px] font-semibold transition active:scale-95 ${on ? "border-accent bg-accent/25 text-ink" : "border-line bg-white/8 text-ink-2"}`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <p id="mascot-name-msg" role={error ? "alert" : undefined} className={`mt-2 min-h-5 px-1 text-[12.5px] ${error ? "text-bad" : "text-ink-2/80"}`}>
        {error ?? hint}
      </p>
      <div className={`mt-3 grid gap-3 ${keepLabel ? "grid-cols-2" : "grid-cols-1"}`}>
        {keepLabel && (
          <Button type="button" size="lg" variant="ghost" loading={busy === "keep"} disabled={!!busy} onClick={() => void run("keep")} className="whitespace-nowrap px-3! text-[15px]!">
            {keepLabel}
          </Button>
        )}
        <Button type="submit" size="lg" loading={busy === "save"} disabled={!!busy || !normalizeMascotName(value)} onMouseDown={(e) => e.preventDefault()} className="whitespace-nowrap px-3! text-[15px]!">
          {saveLabel}
        </Button>
      </div>
    </SafeForm>
  );
}
